import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuthStore } from "@/stores/auth-store";
import { getAuthDestination } from "@/lib/auth-redirect";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";

const signinSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, "Enter your username."),
  password: z.string().min(1, "Enter your password."),
});
type Field = keyof z.infer<typeof signinSchema>;
type Errors = Partial<Record<Field, string>>;

export function SigninForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const signIn = useAuthStore((state) => state.signIn);
  const isLoading = useAuthStore((state) => state.isLoading);
  const apiError = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  useEffect(() => { clearError(); }, [clearError]);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = signinSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!result.success) {
      const nextErrors: Errors = {};
      for (const issue of result.error.issues) {
        nextErrors[issue.path[0] as Field] ??= issue.message;
      }
      setErrors(nextErrors);
      setMessage("Please check the highlighted fields.");
      const firstField = event.currentTarget.elements.namedItem(result.error.issues[0]?.path[0] as string);
      if (firstField instanceof HTMLInputElement) firstField.focus();
      return;
    }
    setErrors({});
    setMessage("");
    if (await signIn(result.data)) navigate(getAuthDestination(location.state?.from), { replace: true });
  }

  return (
    <section className="signup-container" aria-labelledby="signin-title">
      <div className="signup-titlebar">
        <span className="window-filename">✧ chippy / welcome back</span>
        <span className="window-controls" aria-hidden="true"><span>−</span><span>□</span><span>×</span></span>
      </div>
      <div className="signup-window-body signin-window-body">
        <div className="signup-intro">
          <span className="signup-kaomoji" aria-hidden="true">(｡•ᴗ•｡)ﾉ♡</span>
          <h1 id="signin-title">Hello again</h1>
        </div>
        <form className="signup-form" noValidate onSubmit={handleSubmit} onChange={(event) => {
          if (event.target instanceof HTMLInputElement) {
            const field = event.target.name;
            setErrors((previous) => ({ ...previous, [field]: undefined }));
            setMessage("");
            clearError();
          }
        }}>
          <div className="signup-field">
            <label htmlFor="signin-username">Username</label>
            <input id="signin-username" name="username" autoComplete="username" required aria-invalid={!!errors.username || undefined} aria-describedby={errors.username ? "signin-username-error" : undefined} />
            {errors.username && <p className="signup-field-error" id="signin-username-error">{errors.username}</p>}
          </div>
          <div className="signup-field">
            <label htmlFor="signin-password">Password</label>
            <div className="signin-password-input">
              <input id="signin-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required aria-invalid={!!errors.password || undefined} aria-describedby={errors.password ? "signin-password-error" : undefined} />
              <button className="password-toggle" type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
            {errors.password && <p className="signup-field-error" id="signin-password-error">{errors.password}</p>}
          </div>
          <button className="signup-submit" type="submit" disabled={isLoading}>{isLoading ? "Signing in…" : "Sign in"} <span aria-hidden="true">↗</span></button>
          {(apiError || message || location.state?.accountCreated) && <p className="signup-message" role="status">{apiError || message || "Account created! Sign in with your username."}</p>}
          <p className="auth-switch">New around here? <Link to="/signup">Join Chippy</Link></p>
        </form>
      </div>
    </section>
  );
}


