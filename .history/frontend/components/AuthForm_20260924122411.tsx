import styled from "styled-components";
import { useState, type FormEvent } from "react";
import { authRouter } from "../../api/src/routes/auth.routes";

const [mode, setMode] = useState<"signin" | "signup">("signin");
const { login, register, loading, error } = useServices();

const handleSubmit = (e: FormEvent) => {
  e.preventDefault();
  if (mode === "signin") void login(email, password);
  else void register(email, password);
};
