import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { routes } from './app.routes';
import { VaultSessionService } from './core/vault/vault-session.service';
import { WebCryptoService } from './core/vault/web-crypto.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the master layout with sidebar', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  it('should clear vault key when navigating to a public auth route (e.g. login)', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const vaultSession = TestBed.inject(VaultSessionService);
    const lockSpy = vi.spyOn(vaultSession, 'lockInMemory');

    await router.navigateByUrl('/login');
    expect(lockSpy).toHaveBeenCalled();
  });

  it('calls noteActivity at most once per second for discrete document activity', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const crypto = TestBed.inject(WebCryptoService);
    const spy = vi.spyOn(crypto, 'noteActivity');
    const app = fixture.componentInstance;

    const ev = (target: EventTarget) => {
      const e = new MouseEvent('mousedown', { bubbles: true });
      Object.defineProperty(e, 'target', { value: target, enumerable: true });
      return e;
    };

    app.onDiscreteUserActivity(ev(document.body));
    app.onDiscreteUserActivity(ev(document.body));
    expect(spy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    app.onDiscreteUserActivity(ev(document.body));
    expect(spy).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('throttles pointer move activity on a longer window than discrete activity', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const crypto = TestBed.inject(WebCryptoService);
    const spy = vi.spyOn(crypto, 'noteActivity');
    const app = fixture.componentInstance;

    const move = (target: EventTarget) => {
      const e = new MouseEvent('mousemove', { bubbles: true });
      Object.defineProperty(e, 'target', { value: target, enumerable: true });
      return e;
    };

    app.onPointerMoveUserActivity(move(document.body));
    app.onPointerMoveUserActivity(move(document.body));
    expect(spy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(19_999);
    app.onPointerMoveUserActivity(move(document.body));
    expect(spy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    app.onPointerMoveUserActivity(move(document.body));
    expect(spy).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

});
