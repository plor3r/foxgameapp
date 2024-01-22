import {
  Outlet,
  RouterProvider,
  createBrowserRouter,
} from "react-router-dom";
// import { ConnectButton } from "@mysten/dapp-kit";
// import { WalletStatus } from "./WalletStatus";
// import { Box, Container, Typography } from '@mui/material';
import ErrorPage from "./pages/error-page";
import Game from "./pages/game";
import Home from "./pages/home";
import { NavBar } from "./components/NavBar";

function MainLayout() {
  return (
    <div className="px-8 rootimage min-h-screen">
      <NavBar />
      <Outlet />
    </div>
  );
}

export default function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <MainLayout />,
      errorElement: <ErrorPage />,
      children: [
        {
          path: "/",
          element: <Home />,
          children: [],
        },
        {
          path: "game",
          element: <Game />,
          children: [],
        },
      ],
    },
  ]);
  return (
    <RouterProvider router={router} />
  );
}
