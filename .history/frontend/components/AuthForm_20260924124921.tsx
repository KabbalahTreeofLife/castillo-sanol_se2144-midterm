// import styled from "styled-components";
// import { useState, type FormEvent } from "react";
// import { authRouter } from "../../api/src/routes/auth.routes";

// const [mode, setMode] = useState<"signin" | "signup">("signin");
// const { login, register, loading, error } = useServices();

// const handleSubmit = (e: FormEvent) => {
//   return (
//     <Form onSubmit={handleSubmit}>
//       <div>
//         <Title>Serice Hub</Title>
//         <Subtitle>Service</Subtitle>
//       </div>
//       {error ? <Error>{error}</Error> : null}
//       <Field>
//         Email
//         <Input
//           type="email"
//           value={email}
//           onChange={(event) => setEmail(event.target.value)}
//           autoComplete="username"
//           required
//         />
//       </Field>
//       <Field>
//         Password
//         <Input
//           type="password"
//           value={password}
//           onChange={(event) => setPassword(event.target.value)}
//           autoComplete={mode === "signin" ? "current-password" : "new-password"}
//           minLength={6}
//           required
//         />
//       </Field>

//       <Button type="submit" disabled={loading}>
//         {loading
//           ? "Please wait…"
//           : mode === "signin"
//             ? "Sign In"
//             : "Create Account"}
//       </Button>
//       <SwitchRow>
//         {mode === "signin" ? (
//           <>
//             Don't have an account?{" "}
//             <SwitchButton type="button" onClick={() => setMode("signup")}>
//               Sign up
//             </SwitchButton>
//           </>
//         ) : (
//           <>
//             Already have an account?{" "}
//             <SwitchButton type="button" onClick={() => setMode("signin")}>
//               Sign in
//             </SwitchButton>
//           </>
//         )}
//       </SwitchRow>
//     </Form>
//   );
// };
