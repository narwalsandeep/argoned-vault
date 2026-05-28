import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { describe, expect, it } from 'vitest';

import { platformAdminGuard } from './platform-admin.guard';
import { AuthService } from './auth.service';

describe('platformAdminGuard', () => {
  it('should allow when user is platform admin', () => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        {
          provide: AuthService,
          useValue: {
            user: () => ({ id: '1', email: 'admin@test.com', platform_admin: true }),
          },
        },
      ],
    });
    const result = TestBed.runInInjectionContext(() => platformAdminGuard({} as never, {} as never));
    expect(result).toBe(true);
  });

  it('should redirect to dashboard when not platform admin', () => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        {
          provide: AuthService,
          useValue: {
            user: () => ({ id: '1', email: 'user@test.com', platform_admin: false }),
          },
        },
      ],
    });
    const result = TestBed.runInInjectionContext(() => platformAdminGuard({} as never, {} as never));
    const router = TestBed.inject(Router);
    expect(result).toEqual(router.createUrlTree(['/dashboard']));
  });
});
