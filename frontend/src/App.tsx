import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth-context";
import { ProtectedRoute, ROLE_HOME } from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";

import ColaboradorLayout from "./pages/colaborador/ColaboradorLayout";
import MeuPainelPage from "./pages/colaborador/MeuPainelPage";
import NovaVendaPage from "./pages/colaborador/NovaVendaPage";
import MinhasVendasPage from "./pages/colaborador/MinhasVendasPage";

import SupervisorLayout from "./pages/supervisor/SupervisorLayout";
import SupervisorOverviewPage from "./pages/supervisor/OverviewPage";
import SupervisorColaboradorDetailPage from "./pages/supervisor/ColaboradorDetailPage";
import SupervisorUsuariosPage from "./pages/supervisor/UsuariosPage";

import MasterLayout from "./pages/master/MasterLayout";
import MasterOverviewPage from "./pages/master/OverviewPage";
import MasterColaboradorDetailPage from "./pages/master/ColaboradorDetailPage";
import MasterUsuariosPage from "./pages/master/UsuariosPage";

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[user.role]} replace />;
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute allowedRoles={["COLABORADOR"]} />}>
            <Route element={<ColaboradorLayout />}>
              <Route path="/colaborador" element={<MeuPainelPage />} />
              <Route path="/colaborador/nova-venda" element={<NovaVendaPage />} />
              <Route path="/colaborador/vendas" element={<MinhasVendasPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["SUPERVISOR"]} />}>
            <Route element={<SupervisorLayout />}>
              <Route path="/supervisor" element={<SupervisorOverviewPage />} />
              <Route path="/supervisor/colaboradores/:id" element={<SupervisorColaboradorDetailPage />} />
              <Route path="/supervisor/usuarios" element={<SupervisorUsuariosPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["MASTER"]} />}>
            <Route element={<MasterLayout />}>
              <Route path="/master" element={<MasterOverviewPage />} />
              <Route path="/master/colaboradores/:id" element={<MasterColaboradorDetailPage />} />
              <Route path="/master/usuarios" element={<MasterUsuariosPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}
