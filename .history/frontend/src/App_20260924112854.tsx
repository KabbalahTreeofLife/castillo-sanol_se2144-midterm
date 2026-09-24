import styled from "styled-components";
import LoginForm from "../components/AuthForm";

const Shell = styled.div`
  max-width: 760px;
  margin: 0 auto;
  padding: 2rem 1rem;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const Brand = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  margin: 0;
  color: #0f172a;
`;

const BrandTag = styled.span`
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #3b82f6;
`;

const UserBox = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const Email = styled.span`
  font-size: 0.85rem;
  color: #64748b;
`;

const LogoutButton = styled.button`
  padding: 0.4rem 0.8rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: white;
  color: #334155;
  font-size: 0.8rem;
  cursor: pointer;

  &:hover {
    background: #f1f5f9;
  }
`;

const ErrorBanner = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.7rem 1rem;
  margin-bottom: 1.5rem;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 0.85rem;
`;

const DismissButton = styled.button`
  border: none;
  background: transparent;
  color: #b91c1c;
  font-size: 0.9rem;
  cursor: pointer;
  font-weight: 700;
`;

// function Dashboard() {
//   const { user, logout } = useIncidents();

//   return (
//     <>
//       <Header>
//         <Brand>
//           <Title>PulseDesk</Title>
//           <BrandTag>IT Incident Desk</BrandTag>
//         </Brand>
//         <UserBox>
//           <Email>{user?.email}</Email>
//           <LogoutButton onClick={logout}>Logout</LogoutButton>
//         </UserBox>
//       </Header>
//     </>
//   );
// }

// function App() {
//   const { user, error, dispatch } = useIncidents();

//   return (
//     <Shell>
//       {error ? (
//         <ErrorBanner>
//           <span>{error}</span>
//           <DismissButton
//             onClick={() => dispatch({ type: "SET_ERROR", payload: "" })}
//             aria-label="Dismiss error"
//           >
//             ×
//           </DismissButton>
//         </ErrorBanner>
//       ) : null}
//       {user ? <Dashboard /> : <LoginForm />}
//     </Shell>
//   );
// }

export default App;
