import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ToastService } from '../services/toast/toast.service';
import { AuthenticationService } from './services/authentication.service';
import { SKIP_ERROR_TOAST } from './skip-error-toast.context';
import { tokenInterceptor } from './token.interceptor';

const URL = 'https://test.api/reservations';

describe('tokenInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let toastService: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['error']);
    const authService = jasmine.createSpyObj<AuthenticationService>('AuthenticationService', [
      'getTokens',
    ]);
    authService.getTokens.and.returnValue(null);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tokenInterceptor])),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: toastService },
        { provide: AuthenticationService, useValue: authService },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function signInAs(idToken: string): void {
    const authService = TestBed.inject(AuthenticationService) as jasmine.SpyObj<AuthenticationService>;
    authService.getTokens.and.returnValue({ idToken, accessToken: 'access-token' } as ReturnType<
      AuthenticationService['getTokens']
    >);
  }

  it('shows the server message in a toast for a 400 response', () => {
    http.post(URL, {}).subscribe({ error: () => undefined });

    httpMock
      .expectOne(URL)
      .flush({ message: 'Overlaps' }, { status: 400, statusText: 'Bad Request' });

    expect(toastService.error).toHaveBeenCalledWith('Overlaps', 'Error');
  });

  it('does not show a toast but still rethrows when SKIP_ERROR_TOAST is set', () => {
    let receivedStatus: number | undefined;
    http
      .post(URL, {}, { context: new HttpContext().set(SKIP_ERROR_TOAST, true) })
      .subscribe({ error: (error) => (receivedStatus = error.status) });

    httpMock
      .expectOne(URL)
      .flush({ message: 'Overlaps' }, { status: 400, statusText: 'Bad Request' });

    expect(toastService.error).not.toHaveBeenCalled();
    expect(receivedStatus).toBe(400);
  });

  it('does not show a toast for a /guest/ request when SKIP_ERROR_TOAST is set', () => {
    const guestUrl = 'https://test.api/guest/groups/grp-1/sessions';
    let receivedStatus: number | undefined;
    http
      .get(guestUrl, { context: new HttpContext().set(SKIP_ERROR_TOAST, true) })
      .subscribe({ error: (error) => (receivedStatus = error.status) });

    httpMock.expectOne(guestUrl).flush({ error: 'Down' }, { status: 500, statusText: 'Server Error' });

    expect(toastService.error).not.toHaveBeenCalled();
    expect(receivedStatus).toBe(500);
  });

  it('adds the signed-in Owner token to an Owner-only /guest/groups/ request', () => {
    signInAs('owner-id-token');
    const groupUrl = 'https://test.api/guest/groups/grp-1/sessions';
    http.get(groupUrl).subscribe();

    const req = httpMock.expectOne(groupUrl);
    expect(req.request.headers.get('Authorization')).toBe('Bearer owner-id-token');
    req.flush({ participants: [], total: 0 });
  });

  it('does not add the Owner token to other /guest/ requests', () => {
    signInAs('owner-id-token');
    const sessionUrl = 'https://test.api/guest/sessions/sess-1/menu';
    http.get(sessionUrl).subscribe();

    const req = httpMock.expectOne(sessionUrl);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('keeps an Authorization header that a /guest/groups/ request already has', () => {
    signInAs('owner-id-token');
    const groupUrl = 'https://test.api/guest/groups/grp-1/status';
    http.get(groupUrl, { headers: { Authorization: 'Bearer guest-token' } }).subscribe();

    const req = httpMock.expectOne(groupUrl);
    expect(req.request.headers.get('Authorization')).toBe('Bearer guest-token');
    req.flush({});
  });

  it('sends a /guest/groups/ request without a token when nobody is signed in', () => {
    const groupUrl = 'https://test.api/guest/groups/grp-1/sessions';
    http.get(groupUrl).subscribe();

    const req = httpMock.expectOne(groupUrl);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ participants: [], total: 0 });
  });

  it('still shows a toast for a normal /guest/ request', () => {
    const guestUrl = 'https://test.api/guest/groups/grp-1/sessions';
    http.get(guestUrl).subscribe({ error: () => undefined });

    httpMock.expectOne(guestUrl).flush({ error: 'Down' }, { status: 500, statusText: 'Server Error' });

    expect(toastService.error).toHaveBeenCalled();
  });
});
