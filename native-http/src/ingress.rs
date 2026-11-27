//! Bounded, first-request-anchored monotonic window. Only the TCP peer is trusted.
use std::{
    collections::HashMap,
    net::IpAddr,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};
use tokio::sync::{OwnedSemaphorePermit, Semaphore};

pub const CONNECTIONS: usize = 128;
pub const CONNECTION_LIFETIME: Duration = Duration::from_secs(10);
pub const IDLE: Duration = Duration::from_secs(5);
pub const MAX_BODY: usize = 1_048_576;
const WINDOW: Duration = Duration::from_secs(1);

struct Window {
    start: Option<Instant>,
    total: u32,
    peers: HashMap<IpAddr, u32>,
}

pub struct Ingress {
    window: Mutex<Window>,
    active: Arc<Semaphore>,
    global: u32,
    per_peer: u32,
}

impl Ingress {
    pub fn new() -> Self {
        Self::with_limits(60, 20, 32)
    }

    fn with_limits(global: u32, per_peer: u32, active: usize) -> Self {
        Self {
            window: Mutex::new(Window {
                start: None,
                total: 0,
                peers: HashMap::new(),
            }),
            active: Arc::new(Semaphore::new(active)),
            global,
            per_peer,
        }
    }

    pub fn admit(&self, peer: IpAddr, now: Instant) -> Option<OwnedSemaphorePermit> {
        let mut window = self.window.lock().unwrap_or_else(|e| e.into_inner());
        if window
            .start
            .is_none_or(|t| now.saturating_duration_since(t) >= WINDOW)
        {
            window.start = Some(now);
            window.total = 0;
            window.peers.clear();
        }
        if window.total >= self.global
            || window.peers.get(&peer).copied().unwrap_or(0) >= self.per_peer
        {
            return None;
        }
        let permit = self.active.clone().try_acquire_owned().ok()?;
        window.total += 1;
        *window.peers.entry(peer).or_default() += 1;
        Some(permit)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn per_peer_active_global_budgets_recover_independently() {
        let ingress = Ingress::with_limits(2, 1, 1);
        let first = "127.0.0.1".parse().unwrap();
        let other = "127.0.0.2".parse().unwrap();
        let third = "127.0.0.3".parse().unwrap();
        let now = Instant::now();
        let guard = ingress.admit(first, now).unwrap();
        assert!(ingress.admit(other, now).is_none());
        drop(guard);
        assert!(ingress.admit(first, now).is_none());
        assert!(ingress.admit(other, now).is_some());
        assert!(ingress
            .admit(third, now + Duration::from_millis(999))
            .is_none());
        assert!(ingress.admit(first, now + WINDOW).is_some());
    }
}
