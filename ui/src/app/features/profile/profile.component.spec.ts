import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/ui/toast.service';
import { ProfileComponent } from './profile.component';

describe('ProfileComponent', () => {
  it('saveDisplayName calls API with raw value', () => {
    const updateDisplayName = vi.fn(() => of({ status: 'ok' as const, user: {} as never, csrf_token: 'x' }));
    TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            user: () => ({
              id: '1',
              email: 'a@b.com',
              first_name: 'A',
              last_name: 'B',
              display_name: null,
            }),
            updateDisplayName,
          },
        },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(ProfileComponent);
    const comp = fixture.componentInstance;
    comp.profileForm.patchValue({ display_name: '  Pat Q  ' });
    comp.saveDisplayName();
    expect(updateDisplayName).toHaveBeenCalledWith('  Pat Q  ');
  });
});
