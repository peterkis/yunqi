import { navigationItems } from '../../app/routes';

export function Navigation() {
  return (
    <nav className="workbench-navigation" aria-label="工作台导航">
      <p className="navigation-eyebrow">工作台导航</p>
      <ul className="navigation-list">
        {navigationItems.map((item) => (
          <li key={item.id}>
            {item.status === 'active' ? (
              <span className="navigation-item is-active" aria-current="page">
                <span className="navigation-mark" aria-hidden="true">
                  壹
                </span>
                {item.label}
              </span>
            ) : (
              <span
                className="navigation-item is-placeholder"
                aria-disabled="true"
              >
                <span className="navigation-mark" aria-hidden="true">
                  待
                </span>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="navigation-note">Phase 3-B · 基础设施阶段</p>
    </nav>
  );
}
