import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { type Observable, firstValueFrom, isObservable, of } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { AuthService } from './auth.service';
import { guestGuard } from './guest.guard';

function runGuard(): unknown {
  return TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));
}

describe('guestGuard', () => {
  it('redirects to dashboard when already logged in', () => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: { isLoggedIn: () => true, tryRestoreSession: () => of(false) } },
      ],
    });
    const router = TestBed.inject(Router);
    const res = runGuard();
    expect(res).toEqual(router.parseUrl('/dashboard'));
  });

  it('allows route when not logged in and session restore fails', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: { isLoggedIn: () => false, tryRestoreSession: () => of(false) } },
      ],
    });
    const res = runGuard();
    if (isObservable(res)) {
      expect(await firstValueFrom(res)).toBe(true);
    } else {
      expect(res).toBe(true);
    }
  });

  it('redirects to dashboard when session restore succeeds', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: { isLoggedIn: () => false, tryRestoreSession: () => of(true) } },
      ],
    });
    const router = TestBed.inject(Router);
    const res = runGuard();
    expect(isObservable(res)).toBe(true);
    expect(await firstValueFrom(res as Observable<unknown>)).toEqual(router.parseUrl('/dashboard'));
  });
});
