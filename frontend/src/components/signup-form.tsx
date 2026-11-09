import { useState, type ComponentProps, type FormEvent } from "react";
import { z } from "zod";
import { Link, useNavigate } from "react-router";
import { useAuthStore } from "@/stores/auth-store";

const signupSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name."),
  lastName: z.string().trim().min(1, "Enter your last name."),
  username: z.string().trim().min(3, "Use at least 3 characters."),
  email: z.string().trim().pipe(z.email("Enter a valid email address.")),
  password: z.string().min(8, "Use at least 8 characters."),
  confirmPassword: z.string().min(1, "Confirm your password."),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Your passwords don't match.",
  path: ["confirmPassword"],
});

type SignupValues = z.infer<typeof signupSchema>;
type FieldErrors = Partial<Record<keyof SignupValues, string>>;

export function SignupForm({ className = "", ...props }: ComponentProps<"section">) {
  const navigate = useNavigate();
  const signUp = useAuthStore((state) => state.signUp);
  const isLoading = useAuthStore((state) => state.isLoading);
  const apiError = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  // Validate all submitted values before using them to create an account.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = signupSchema.safeParse(Object.fromEntries(data));

    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof SignupValues;
        fieldErrors[field] ??= issue.message;
      }
      setErrors(fieldErrors);
      setMessage("Please check the highlighted fields.");
      const firstInvalidField = event.currentTarget.elements.namedItem(result.error.issues[0]?.path[0] as string);
      if (firstInvalidField instanceof HTMLInputElement) firstInvalidField.focus();
      return;
    }

    setErrors({});
    setMessage("");
    const { username, email, password, firstName, lastName } = result.data;
    if (await signUp({ username, email, password, firstName, lastName })) {
      navigate("/signin", { state: { accountCreated: true }, replace: true });
    }
  }

  function clearFieldError(event: FormEvent<HTMLFormElement>) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    clearError();
    setMessage("");
    setErrors((previous) => ({
      ...previous,
      [input.name]: undefined,
      ...(input.name === "password" ? { confirmPassword: undefined } : {}),
    }));
  }

  function fieldAccessibility(field: keyof SignupValues) {
    return {
      "aria-invalid": errors[field] ? true : undefined,
      "aria-describedby": errors[field] ? `${field}-error` : undefined,
    };
  }

  function fieldError(field: keyof SignupValues) {
    return errors[field] ? <p className="signup-field-error" id={`${field}-error`}>{errors[field]}</p> : null;
  }

  return (
    <section className={`signup-container ${className}`} aria-labelledby="signup-title" {...props}>
      <div className="signup-titlebar">
        <span className="window-filename">✧ chippy / new friend</span>
        <span className="window-controls" aria-hidden="true"><span>−</span><span>□</span><span>×</span></span>
      </div>
      <div className="signup-window-body">
        <div className="signup-intro">
          <span className="signup-kaomoji" aria-hidden="true">(づ｡•ᴗ•｡)づ</span>
          <h1 id="signup-title">Join Chippy</h1>
          <p>Your people are just a little hello away.</p>
        </div>
        <form className="signup-form" noValidate onSubmit={handleSubmit} onChange={clearFieldError}>
          <div className="signup-passwords">
            <div className="signup-field">
              <label htmlFor="firstName">First name</label>
              <input id="firstName" name="firstName" autoComplete="given-name" required {...fieldAccessibility("firstName")} />
              {fieldError("firstName")}
            </div>
            <div className="signup-field">
              <label htmlFor="lastName">Last name</label>
              <input id="lastName" name="lastName" autoComplete="family-name" required {...fieldAccessibility("lastName")} />
              {fieldError("lastName")}
            </div>
          </div>
          <div className="signup-field">
            <label htmlFor="username">Username <span>your little internet name</span></label>
            <input id="username" name="username" autoComplete="username" placeholder="e.g. moonflower" required {...fieldAccessibility("username")} />
            {fieldError("username")}
          </div>
          <div className="signup-field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required {...fieldAccessibility("email")} />
            {fieldError("email")}
          </div>
          <div className="signup-passwords">
            <div className="signup-field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" minLength={8} autoComplete="new-password" placeholder="8+ characters" required {...fieldAccessibility("password")} />
              {fieldError("password")}
            </div>
            <div className="signup-field">
              <label htmlFor="confirmPassword">Confirm password</label>
              <input id="confirmPassword" name="confirmPassword" type="password" minLength={8} autoComplete="new-password" placeholder="one more time" required {...fieldAccessibility("confirmPassword")} />
              {fieldError("confirmPassword")}
            </div>
          </div>
          <button className="signup-submit" type="submit" disabled={isLoading}>{isLoading ? "Creating account…" : "Create account"} <span aria-hidden="true">↗</span></button>
          <p className="signup-message" id="signup-message" role="status">{apiError || message || "A new friendship starts with hello."}</p>
          <p className="auth-switch">Already a little friend? <Link to="/signin">Sign in</Link></p>
        </form>
      </div>
      <div className="signup-window-status"><span>♡ a space for you & your people</span><span aria-hidden="true">✦</span></div>
    </section>
  );
}

