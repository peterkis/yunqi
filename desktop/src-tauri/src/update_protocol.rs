use std::{fs, io, path::Path, time::Duration};

use base64::{engine::general_purpose::STANDARD, Engine};
use ed25519_dalek::{Signature, VerifyingKey};
use reqwest::{Client, Response, StatusCode, Url};
use semver::Version;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tokio::{fs::File, io::AsyncReadExt};

pub const CHUNK: u64 = 2 * 1024 * 1024;
const MAX_PACKAGE: u64 = 512 * 1024 * 1024;
pub const METADATA_LIMIT: u64 = 64 * 1024;
pub const CHECK_TIME: Duration = Duration::from_secs(2);

#[derive(Clone, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Envelope {
    payload: String,
    signature: String,
}

#[derive(Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Release {
    pub version: String,
    pub platform: String,
    pub webview_min: u32,
    pub length: u64,
    pub digest: String,
    pub chunk_size: u64,
    pub chunks: Vec<String>,
    #[serde(skip)]
    pub manifest_digest: String,
}

impl Release {
    pub fn matches_manifest(&self, digest: &str) -> bool {
        self.manifest_digest == digest
    }

    pub fn supports_webview(&self, major: Option<u32>) -> bool {
        major.is_some_and(|major| major >= self.webview_min)
    }

    pub fn can_reuse_package(&self, cached: &Self) -> bool {
        self.digest == cached.digest && self.length == cached.length && self.chunks == cached.chunks
    }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Approval {
    nonce: String,
    version: String,
    digest: String,
    manifest_digest: String,
    allowed: bool,
}

pub fn invalid() -> io::Error {
    io::Error::other("invalid update data")
}

fn public_key(value: Option<&str>) -> Option<VerifyingKey> {
    let bytes = hex::decode(value?).ok()?;
    VerifyingKey::from_bytes(&bytes.try_into().ok()?).ok()
}

fn verified_payload(envelope: &Envelope, key: &VerifyingKey) -> io::Result<Vec<u8>> {
    let payload = STANDARD.decode(&envelope.payload).map_err(|_| invalid())?;
    let bytes = STANDARD
        .decode(&envelope.signature)
        .map_err(|_| invalid())?;
    let signature = Signature::from_slice(&bytes).map_err(|_| invalid())?;
    key.verify_strict(&payload, &signature)
        .map_err(|_| invalid())?;
    Ok(payload)
}

fn verify<T: DeserializeOwned>(envelope: &Envelope, key: &VerifyingKey) -> io::Result<T> {
    serde_json::from_slice(&verified_payload(envelope, key)?).map_err(|_| invalid())
}

pub fn hash(bytes: &[u8]) -> String {
    hex::encode(Sha256::digest(bytes))
}

fn digest_string(value: &str) -> bool {
    value.len() == 64
        && value
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}

pub fn remove(file: &Path) -> io::Result<()> {
    match fs::remove_file(file) {
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(()),
        result => result,
    }
}

pub fn clear_authorization(root: &Path) -> io::Result<()> {
    remove(&root.join("next.txt"))?;
    remove(&root.join("ready.json"))
}

pub struct ManifestCheck {
    pub installable: Option<(Envelope, Release)>,
    pub revoked: bool,
}

pub struct Source {
    url: Url,
    client: Client,
    release_key: VerifyingKey,
    approval_key: VerifyingKey,
    running: Version,
}

impl Source {
    pub fn configured() -> Option<Self> {
        let url = Url::parse(option_env!("YUNQI_UPDATE_URL")?).ok()?;
        if !matches!(url.scheme(), "http" | "https")
            || url.host_str().is_none()
            || !url.username().is_empty()
            || url.password().is_some()
            || url.path() != "/"
            || url.query().is_some()
            || url.fragment().is_some()
        {
            return None;
        }
        let client = Client::builder()
            .no_proxy()
            .redirect(reqwest::redirect::Policy::none())
            .connect_timeout(CHECK_TIME)
            .build()
            .ok()?;
        Some(Self {
            url,
            client,
            release_key: public_key(option_env!("YUNQI_UPDATE_RELEASE_KEY"))?,
            approval_key: public_key(option_env!("YUNQI_UPDATE_APPROVAL_KEY"))?,
            running: Version::parse(
                option_env!("YUNQI_UPDATE_BUILD_VERSION").unwrap_or(env!("CARGO_PKG_VERSION")),
            )
            .ok()?,
        })
    }

    fn verified_release(&self, envelope: &Envelope) -> io::Result<(Release, Version)> {
        let payload = verified_payload(envelope, &self.release_key)?;
        let mut manifest: Release = serde_json::from_slice(&payload).map_err(|_| invalid())?;
        manifest.manifest_digest = hash(&payload);
        let version = Version::parse(&manifest.version).map_err(|_| invalid())?;
        if !version.pre.is_empty()
            || !version.build.is_empty()
            || manifest.platform != "windows-x64"
            || manifest.webview_min == 0
            || !(2..=MAX_PACKAGE).contains(&manifest.length)
            || !digest_string(&manifest.digest)
            || manifest.chunk_size != CHUNK
            || manifest.length.div_ceil(CHUNK) != manifest.chunks.len() as u64
            || !manifest.chunks.iter().all(|chunk| digest_string(chunk))
        {
            return Err(invalid());
        }
        Ok((manifest, version))
    }

    pub fn release(&self, envelope: &Envelope) -> io::Result<Option<Release>> {
        let (release, version) = self.verified_release(envelope)?;
        Ok((version > self.running).then_some(release))
    }

    pub async fn check_manifest(
        &self,
        root: &Path,
        ready: Option<&Release>,
    ) -> io::Result<ManifestCheck> {
        let response = self.get("release", CHECK_TIME).await?;
        if response.status() == StatusCode::NO_CONTENT {
            // A bare 204 is not proof of withdrawal. Ask for a fresh, signed
            // decision bound to the exact manifest before touching local consent.
            let revoked = if let Some(ready) = ready {
                !self.approve(ready).await?
            } else {
                false
            };
            if revoked {
                clear_authorization(root)?;
            }
            return Ok(ManifestCheck {
                installable: None,
                revoked,
            });
        }
        let envelope = decode(response).await?;
        let (release, version) = self.verified_release(&envelope)?;

        let next_replaced = match fs::read_to_string(root.join("next.txt")) {
            Ok(digest) => !release.matches_manifest(&digest),
            Err(error) if error.kind() == io::ErrorKind::NotFound => false,
            Err(error) => return Err(error),
        };
        let revoked = next_replaced
            || ready.is_some_and(|old| !release.matches_manifest(&old.manifest_digest));
        if revoked {
            // A trusted replacement withdraws consent even if it cannot be installed.
            clear_authorization(root)?;
        }
        Ok(ManifestCheck {
            installable: (version > self.running).then_some((envelope, release)),
            revoked,
        })
    }

    pub async fn approve(&self, release: &Release) -> io::Result<bool> {
        let mut random = [0; 32];
        getrandom::fill(&mut random).map_err(|_| invalid())?;
        let nonce = hex::encode(random);
        let path = format!(
            "approve/{nonce}/{}/{}/{}",
            release.version, release.digest, release.manifest_digest
        );
        let envelope: Envelope = decode(self.get(&path, CHECK_TIME).await?).await?;
        let approval: Approval = verify(&envelope, &self.approval_key)?;
        if approval.nonce != nonce
            || approval.version != release.version
            || approval.digest != release.digest
            || approval.manifest_digest != release.manifest_digest
        {
            return Err(invalid());
        }
        Ok(approval.allowed)
    }

    pub async fn chunk(&self, release: &Release, index: usize) -> io::Result<Vec<u8>> {
        let path = format!("chunks/{}/{index}", release.digest);
        let expected = (release.length - index as u64 * CHUNK).min(CHUNK);
        let response = self.get(&path, Duration::from_secs(40)).await?;
        if response.content_length() != Some(expected) {
            return Err(invalid());
        }
        let bytes = bounded_body(response, expected).await?;
        if bytes.len() as u64 != expected || hash(&bytes) != release.chunks[index] {
            return Err(invalid());
        }
        Ok(bytes)
    }

    async fn get(&self, path: &str, timeout: Duration) -> io::Result<Response> {
        self.client
            .get(self.url.join(path).map_err(|_| invalid())?)
            .timeout(timeout)
            .send()
            .await
            .map_err(io::Error::other)
    }
}

async fn decode<T: DeserializeOwned>(response: Response) -> io::Result<T> {
    serde_json::from_slice(&bounded_body(response, METADATA_LIMIT).await?).map_err(|_| invalid())
}

async fn bounded_body(mut response: Response, limit: u64) -> io::Result<Vec<u8>> {
    if response.status() != StatusCode::OK
        || response
            .content_length()
            .is_some_and(|length| length > limit)
    {
        return Err(invalid());
    }
    let mut bytes = Vec::with_capacity(response.content_length().unwrap_or(0) as usize);
    while let Some(chunk) = response.chunk().await.map_err(io::Error::other)? {
        if bytes.len() as u64 + chunk.len() as u64 > limit {
            return Err(invalid());
        }
        bytes.extend_from_slice(&chunk);
    }
    Ok(bytes)
}

pub async fn verify_file(path: &std::path::Path, release: &Release) -> io::Result<()> {
    let mut file = File::open(path).await?;
    if file.metadata().await?.len() != release.length {
        return Err(invalid());
    }
    let mut digest = Sha256::new();
    let mut length = 0;
    let mut buffer = vec![0; 64 * 1024];
    loop {
        let count = file.read(&mut buffer).await?;
        if count == 0 {
            break;
        }
        length += count as u64;
        if length > release.length {
            return Err(invalid());
        }
        digest.update(&buffer[..count]);
    }
    if length != release.length || hex::encode(digest.finalize()) != release.digest {
        return Err(invalid());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use ed25519_dalek::{Signer, SigningKey};

    #[test]
    fn signed_payload_rejects_an_edited_approval() {
        let key = SigningKey::from_bytes(&[3; 32]);
        let payload = br#"{"nonce":"fresh","version":"0.1.11","digest":"known","manifest_digest":"manifest","allowed":false}"#;
        let mut envelope = Envelope {
            payload: STANDARD.encode(payload),
            signature: STANDARD.encode(key.sign(payload).to_bytes()),
        };
        let approval: Approval = verify(&envelope, &key.verifying_key()).expect("signed approval");
        assert!(!approval.allowed);
        envelope.payload = STANDARD
            .encode(br#"{"nonce":"fresh","version":"0.1.11","digest":"known","manifest_digest":"manifest","allowed":true}"#);
        assert!(verify::<Approval>(&envelope, &key.verifying_key()).is_err());
    }

    #[tokio::test]
    async fn native_http_verifies_the_package_and_fresh_approval() {
        use std::{
            io::{BufRead, BufReader, Write},
            net::TcpListener,
            thread,
        };

        fn signed(payload: serde_json::Value, key: &SigningKey) -> Vec<u8> {
            let bytes = serde_json::to_vec(&payload).unwrap();
            serde_json::to_vec(&Envelope {
                payload: STANDARD.encode(&bytes),
                signature: STANDARD.encode(key.sign(&bytes).to_bytes()),
            })
            .unwrap()
        }

        let release_key = SigningKey::from_bytes(&[1; 32]);
        let approval_key = SigningKey::from_bytes(&[2; 32]);
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let source = Source {
            url: Url::parse(&format!("http://{}/", listener.local_addr().unwrap())).unwrap(),
            client: Client::builder().no_proxy().build().unwrap(),
            release_key: release_key.verifying_key(),
            approval_key: approval_key.verifying_key(),
            running: Version::new(0, 1, 10),
        };
        let package = b"MZ fixture";
        let digest = hash(package);
        let manifest = signed(
            serde_json::json!({
                "version": "0.1.11", "platform": "windows-x64", "webview_min": 145,
                "length": package.len(), "chunk_size": CHUNK, "digest": digest, "chunks": [digest]
            }),
            &release_key,
        );
        let raised_manifest = signed(
            serde_json::json!({
                "version":"0.1.11", "platform":"windows-x64", "webview_min":150,
                "length":package.len(), "chunk_size":CHUNK, "digest":digest, "chunks":[digest]
            }),
            &release_key,
        );
        let installed_manifest = signed(
            serde_json::json!({
                "version": "0.1.10", "platform": "windows-x64", "webview_min": 145,
                "length": package.len(), "chunk_size": CHUNK, "digest": digest, "chunks": [digest]
            }),
            &release_key,
        );
        let untrusted_manifest = signed(
            serde_json::json!({
                "version": "0.1.10", "platform": "windows-x64", "webview_min": 145,
                "length": package.len(), "chunk_size": CHUNK, "digest": digest, "chunks": [digest]
            }),
            &approval_key,
        );
        let manifest_envelope: Envelope = serde_json::from_slice(&manifest).unwrap();
        let manifest_digest = hash(&STANDARD.decode(&manifest_envelope.payload).unwrap());
        let server = thread::spawn(move || {
            for index in 0..20 {
                let (mut connection, _) = listener.accept().unwrap();
                let mut input = BufReader::new(&mut connection);
                let mut request = String::new();
                input.read_line(&mut request).unwrap();
                assert!(!request.is_empty());
                loop {
                    let mut header = String::new();
                    if input.read_line(&mut header).unwrap() == 0 || header == "\r\n" {
                        break;
                    }
                }
                let path = request.split_whitespace().nth(1).unwrap();
                if matches!(index, 11 | 13 | 15 | 17) {
                    assert_eq!(path, "/release");
                    write!(
                        connection,
                        "HTTP/1.1 204 No Content\r\nConnection: close\r\n\r\n"
                    )
                    .unwrap();
                    continue;
                }
                if index == 12 {
                    assert!(path.starts_with("/approve/"));
                    write!(connection, "HTTP/1.1 503 Service Unavailable\r\nContent-Length: 0\r\nConnection: close\r\n\r\n").unwrap();
                    continue;
                }
                let bytes = match index {
                    0 | 10 | 19 => {
                        assert_eq!(path, "/release");
                        manifest.clone()
                    }
                    1 => b"MZ altered".to_vec(),
                    2 => package.to_vec(),
                    8 | 9 => {
                        assert_eq!(path, "/release");
                        if index == 8 {
                            untrusted_manifest.clone()
                        } else {
                            installed_manifest.clone()
                        }
                    }
                    _ => {
                        let fields: Vec<_> = path.split('/').collect();
                        assert_eq!(fields[1], "approve");
                        let nonce = if index == 3 { "replayed" } else { fields[2] };
                        assert_eq!(fields.len(), 6);
                        assert_eq!(fields[5], manifest_digest);
                        let mut payload = serde_json::json!({
                            "nonce": nonce, "version": fields[3], "digest": fields[4],
                            "manifest_digest": if index == 4 { "other" } else { fields[5] },
                            "allowed": !matches!(index, 5 | 14 | 18)
                        });
                        if index == 6 {
                            payload.as_object_mut().unwrap().remove("manifest_digest");
                        }
                        signed(
                            payload,
                            if index == 14 {
                                &release_key
                            } else {
                                &approval_key
                            },
                        )
                    }
                };
                write!(
                    connection,
                    "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                    bytes.len()
                )
                .unwrap();
                connection.write_all(&bytes).unwrap();
            }
        });
        let mut nonce = [0; 16];
        getrandom::fill(&mut nonce).unwrap();
        let root = std::env::temp_dir().join(format!("yunqi-manifest-{}", hex::encode(nonce)));
        fs::create_dir(&root).unwrap();
        let check = source.check_manifest(&root, None).await.unwrap();
        assert!(!check.revoked);
        let (envelope, release) = check.installable.unwrap();
        let payload = STANDARD.decode(&envelope.payload).unwrap();
        assert_eq!(release.manifest_digest, hash(&payload));
        let raised_envelope = serde_json::from_slice(&raised_manifest).unwrap();
        let raised = source.release(&raised_envelope).unwrap().unwrap();
        assert!(raised.can_reuse_package(&release));
        assert!(release.matches_manifest(&release.manifest_digest));
        assert!(
            !raised.matches_manifest(&release.manifest_digest),
            "cached readiness and consent"
        );
        assert!(release.supports_webview(Some(148)));
        assert!(
            !raised.supports_webview(Some(148)),
            "recheck against the newly selected floor"
        );
        assert!(raised.supports_webview(Some(150)));
        assert!(source.chunk(&release, 0).await.is_err(), "modified bytes");
        assert_eq!(source.chunk(&release, 0).await.unwrap(), package);
        assert!(source.approve(&release).await.is_err(), "replayed approval");
        assert!(
            source.approve(&release).await.is_err(),
            "wrong manifest digest"
        );
        assert!(
            !source.approve(&release).await.unwrap(),
            "updated or withdrawn manifest"
        );
        assert!(source.approve(&release).await.is_err(), "legacy approval");
        assert!(source.approve(&release).await.unwrap());

        let ready = root.join("ready.json");
        let next = root.join("next.txt");
        let cached = root.join("package.exe");
        fs::write(&ready, serde_json::to_vec(&envelope).unwrap()).unwrap();
        fs::write(&next, &release.manifest_digest).unwrap();
        fs::write(&cached, package).unwrap();
        assert!(
            source.check_manifest(&root, Some(&release)).await.is_err(),
            "untrusted replacement"
        );
        assert!(ready.exists());
        assert!(next.exists());

        let check = source.check_manifest(&root, Some(&release)).await.unwrap();
        assert!(
            check.revoked,
            "a verified replacement withdraws consent even at the installed version"
        );
        assert!(check.installable.is_none());
        assert!(!ready.exists());
        assert!(!next.exists());
        assert_eq!(fs::read(&cached).unwrap(), package);

        let restored = source.check_manifest(&root, None).await.unwrap();
        assert!(!restored.revoked);
        assert!(restored
            .installable
            .unwrap()
            .1
            .matches_manifest(&release.manifest_digest));
        assert!(
            !next.exists(),
            "re-publishing the original release cannot restore consent"
        );
        // Re-arm A in the test, then withdraw it (204). Neither an unavailable
        // approval service, an unsigned-by-approval-key denial, nor an approval
        // racing with re-publication should erase the stored consent.
        fs::write(&ready, serde_json::to_vec(&envelope).unwrap()).unwrap();
        fs::write(&next, &release.manifest_digest).unwrap();
        for _ in 0..2 {
            assert!(source.check_manifest(&root, Some(&release)).await.is_err());
            assert!(ready.exists() && next.exists());
        }
        assert!(
            !source
                .check_manifest(&root, Some(&release))
                .await
                .unwrap()
                .revoked
        );
        assert!(ready.exists() && next.exists());
        let withdrawn = source.check_manifest(&root, Some(&release)).await.unwrap();
        assert!(withdrawn.revoked);
        assert!(withdrawn.installable.is_none());
        assert!(!ready.exists() && !next.exists());
        assert_eq!(fs::read(&cached).unwrap(), package);
        let republished = source.check_manifest(&root, None).await.unwrap();
        assert!(republished
            .installable
            .unwrap()
            .1
            .matches_manifest(&release.manifest_digest));
        assert!(
            !ready.exists() && !next.exists(),
            "the same manifest cannot re-arm withdrawn consent"
        );
        fs::remove_dir_all(root).unwrap();
        server.join().unwrap();
    }
}
