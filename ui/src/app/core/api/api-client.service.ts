import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from './api.tokens';

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly baseUrl: string,
  ) {}

  public get<T>(path: string, csrfToken?: string, params?: HttpParams): Observable<T> {
    const base = { ...this.options(csrfToken) };
    if (params !== undefined) {
      return this.http.get<T>(this.url(path), { ...base, params });
    }
    return this.http.get<T>(this.url(path), base);
  }

  public post<T>(path: string, body: unknown, csrfToken?: string): Observable<T> {
    return this.http.post<T>(this.url(path), body, this.options(csrfToken));
  }

  /** Public endpoints — no session cookies or CSRF (works logged in or out). */
  public postPublic<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.post<T>(this.url(path), body, { withCredentials: false });
  }

  public put<T>(path: string, body: unknown, csrfToken?: string): Observable<T> {
    return this.http.put<T>(this.url(path), body, this.options(csrfToken));
  }

  public delete<T>(path: string, csrfToken?: string): Observable<T> {
    return this.http.delete<T>(this.url(path), this.options(csrfToken));
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private options(csrfToken?: string): { withCredentials: boolean; headers?: HttpHeaders } {
    if (!csrfToken) {
      return { withCredentials: true };
    }
    return {
      withCredentials: true,
      headers: new HttpHeaders({ 'X-CSRF-Token': csrfToken }),
    };
  }
}

