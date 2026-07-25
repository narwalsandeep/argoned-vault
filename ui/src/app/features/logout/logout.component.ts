import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/ui/toast.service';
import { VaultReadinessService } from '../../core/vault/vault-readiness.service';
import { VaultSessionService } from '../../core/vault/vault-session.service';

@Component({
  selector: 'app-logout',
  standalone: true,
  template: `
    <div class="page-content px-8 pt-12 pb-12">
      <p class="text-app-text-muted">Signing out...</p>
    </div>
  `,
})
export class LogoutComponent {
  constructor(
    private readonly auth: AuthService,
    private readonly vaultSession: VaultSessionService,
    private readonly vaultReadiness: VaultReadinessService,
    private readonly router: Router,
    private readonly toast: ToastService,
  ) {
    this.vaultSession.lockInMemory();
    this.vaultReadiness.invalidate();
    this.auth.logout().subscribe({
      next: () => {
        this.toast.info('Signed out');
        this.router.navigateByUrl('/login');
      },
      error: () => {
        this.toast.info('Signed out');
        this.router.navigateByUrl('/login');
      },
    });
  }
}
