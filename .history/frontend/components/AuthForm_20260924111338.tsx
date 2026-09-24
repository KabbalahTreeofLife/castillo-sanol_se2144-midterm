import styled from "styled-components";
import { useState, type FormEvent } from "react";
import { login, register } from "../../api/src/routes/auth.routes";
import { useIncidents } from "../context/useIncidents";

const Form = styled.form`
  max-width: 360px;
  margin: 4rem auto;
  padding: 2rem;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Title = styled.h1`
  font-size: 1.4rem;
  margin: 0;
  text-align: center;
  color: #0f172a;
`;

const Subtitle = styled.p`
  margin: 0;
  text-align: center;
  color: #64748b;
  font-size: 0.85rem;
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #475569;
`;

const Input = styled.input`
  padding: 0.6rem 0.7rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.9rem;
`;

const Button = styled.button`
  padding: 0.65rem 1rem;
  border: none;
  border-radius: 6px;
  background: #3b82f6;
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Error = styled.p`
  margin: 0;
  color: #b91c1c;
  font-size: 0.85rem;
  text-align: center;
`;

const SwitchRow = styled.div`
  margin-top: 0.5rem;
  text-align: center;
  font-size: 0.85rem;
  color: #64748b;
`;

const SwitchButton = styled.button`
  border: none;
  background: transparent;
  color: #3b82f6;
  font-weight: 600;
  cursor: pointer;
  padding: 0;

  &:hover {
    text-decoration: underline;
  }
`;

type Mode = "signin" | "signup";

export default function LoginForm() {
  const { login, register, loading, error } = useIncidents();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (mode === "signin") {
      void login(email, password);
    } else {
      void register(email, password);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <div>
        <Title>PulseDesk</Title>
        <Subtitle>IT Incident Desk</Subtitle>
      </div>
      {error ? <Error>{error}</Error> : null}
      <Field>
        Email
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="username"
          required
        />
      </Field>
      <Field>
        Password
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          minLength={6}
          required
        />
      </Field>
      <Button type="submit" disabled={loading}>
        {loading
          ? "Please wait…"
          : mode === "signin"
            ? "Sign In"
            : "Create Account"}
      </Button>
      <SwitchRow>
        {mode === "signin" ? (
          <>
            Don&apos;t have an account?{" "}
            <SwitchButton type="button" onClick={() => setMode("signup")}>
              Sign up
            </SwitchButton>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <SwitchButton type="button" onClick={() => setMode("signin")}>
              Sign in
            </SwitchButton>
          </>
        )}
      </SwitchRow>
    </Form>
  );
}
