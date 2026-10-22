import { NavLink } from 'react-router-dom';
import { navigationItems } from '../../app/routes';

export function Navigation() {
  return (
    <nav className="workbench-navigation" aria-label="工作台导航">
      <p className="navigation-eyebrow">工作台导航</p>
      <ul className="navigation-list">
        {navigationItems.map((item) => (
          <li key={item.id}>
            {item.status === 'enabled' ? (
              <NavLink
                className={({ isActive }) =>
                  `navigation-item${isActive ? ' is-active' : ''}`
                }
                end={item.end}
                to={item.to}
              >
                <span className="navigation-mark" aria-hidden="true">
                  {item.mark}
                </span>
                {item.label}
                {item.id === 'inquiry' ? <span className="navigation-status">规划中</span> : null}
              </NavLink>
            ) : (
              <span
                className="navigation-item is-placeholder"
                aria-disabled="true"
              >
                <span className="navigation-mark" aria-hidden="true">
                  {item.mark}
                </span>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="navigation-note">规则学习 · 只读分析</p>
    </nav>
  );
}
