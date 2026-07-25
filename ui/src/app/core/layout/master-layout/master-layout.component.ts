import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../auth/auth.service';
import { LEGAL_CONTACT } from '../../../features/legal/legal.constants';
import { VAULT_ENCRYPTED_ITEMS_ROUTE, VAULT_SESSION_ROUTE } from '../../vault/vault-app-paths';
import { VaultSessionService } from '../../vault/vault-session.service';
import { AppShellModalComponent } from '../../ui/app-shell-modal.component';
import { VaultQuickUnlockDialogComponent } from '../../../features/vault/vault-quick-unlock-dialog.component';
import { ShellIdleLockCountdownComponent } from '../shell-idle-lock-countdown.component';

export interface NavItem {
  route: string;
  label: string;
  icon: string;
  /**
   * When true, a locked vault opens the quick-unlock modal first; after unlock the app navigates to `route`.
   */
  gateWithVaultUnlock?: boolean;
}

@Component({
  selector: 'app-master-layout',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ShellIdleLockCountdownComponent,
    VaultQuickUnlockDialogComponent,
    AppShellModalComponent,
  ],
  templateUrl: './master-layout.component.html',
})
export class MasterLayoutComponent {
  private static readonly shellNavBase = 'app-shell-nav-link';

  public readonly vaultSession = inject(VaultSessionService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  /** Shown only when `/auth/me` marked this session as the configured platform admin. */
  public readonly showAdminCustomersLink = computed(() => this.auth.user()?.platform_admin === true);

  public readonly marketingSiteUrl = LEGAL_CONTACT.marketingSiteUrl;

  public readonly addUnlockModalOpen = signal(false);
  public readonly vaultLockedNoticeOpen = signal(false);
  private readonly pendingNavAfterUnlock = signal<string | null>(null);

  /** Copy for the shared quick-unlock modal (Create vs Vault) while a gated nav target is pending. */
  public readonly leftNavUnlockHeading = computed(() =>
    this.pendingNavAfterUnlock() === VAULT_ENCRYPTED_ITEMS_ROUTE ? 'Unlock to open Vault' : 'Unlock to create',
  );

  public readonly leftNavUnlockSubtext = computed(() =>
    this.pendingNavAfterUnlock() === VAULT_ENCRYPTED_ITEMS_ROUTE
      ? 'Enter your vault unlock secret to open your encrypted items. Your secret is used only in this browser and never sent as plaintext.'
      : 'Enter your vault unlock secret to open Create. Your secret is used only in this browser and never sent as plaintext.',
  );

  public readonly navItems: NavItem[] = [
    { route: '/new', label: 'Create', icon: 'create', gateWithVaultUnlock: true },
    { route: VAULT_ENCRYPTED_ITEMS_ROUTE, label: 'Vault', icon: 'vault', gateWithVaultUnlock: true },
    { route: VAULT_SESSION_ROUTE, label: 'Session', icon: 'clock' },
    // Stats nav is intentionally hidden until dashboard work resumes.
    { route: '/pricing', label: 'Pricing', icon: 'pricing' },
    { route: '/subscription', label: 'Billing', icon: 'subscription' },
    { route: '/alert', label: 'Alert', icon: 'alert' },
    { route: '/settings', label: 'Settings', icon: 'settings' },
  ];

  public readonly rightNavItems: NavItem[] = [
    { route: '/profile', label: 'Account', icon: 'profile' },
    { route: '/docs', label: 'Docs', icon: 'docs' },
    { route: '/logout', label: 'Logout', icon: 'logout' },
  ];

  /**
   * Sidebar link styles are defined globally in styles/layout.css (.app-shell-nav-link*).
   */
  public shellNavLinkClass(icon: string): string {
    const base = MasterLayoutComponent.shellNavBase;
    if (icon === 'create') {
      return `${base} app-shell-nav-link--add`;
    }
    return `${base} app-shell-nav-link--muted`;
  }

  /** Right rail uses `.app-shell-icon-btn`; logout keeps the same quiet treatment as the old left-rail link. */
  public shellIconBtnClass(icon: string): string {
    return icon === 'logout' ? 'app-shell-icon-btn app-shell-icon-btn--logout' : 'app-shell-icon-btn';
  }

  public lockVaultFromSidebar(): void {
    this.vaultSession.lockInMemory();
    this.vaultLockedNoticeOpen.set(true);
  }

  public onVaultLockedNoticeDismissed(): void {
    this.vaultLockedNoticeOpen.set(false);
  }

  public onLeftNavGatedClick(item: NavItem): void {
    if (!item.gateWithVaultUnlock) {
      return;
    }
    if (this.vaultSession.isUnlocked()) {
      void this.router.navigateByUrl(item.route);
      return;
    }
    this.pendingNavAfterUnlock.set(item.route);
    this.addUnlockModalOpen.set(true);
  }

  public onAddUnlockSuccess(): void {
    this.addUnlockModalOpen.set(false);
    const target = this.pendingNavAfterUnlock() ?? '/new';
    this.pendingNavAfterUnlock.set(null);
    void this.router.navigateByUrl(target);
  }

  public onAddUnlockCancel(): void {
    this.addUnlockModalOpen.set(false);
    this.pendingNavAfterUnlock.set(null);
  }

  /** Active state for gated left-nav entries (subset match, same idea as `routerLinkActive`). */
  public isLeftNavRouteActive(route: string): boolean {
    return this.router.isActive(route, {
      paths: 'subset',
      queryParams: 'ignored',
      fragment: 'ignored',
      matrixParams: 'ignored',
    });
  }

  public leftNavGatedButtonClass(item: NavItem): string {
    const base = this.shellNavLinkClass(item.icon);
    return this.isLeftNavRouteActive(item.route) ? `${base} app-shell-nav-link--active` : base;
  }
}
