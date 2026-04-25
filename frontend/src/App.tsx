import Providers from "./providers";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import "./App.css";

export default function App() {
  return (
    <Providers>
      <div className="app">
        <Header />
        <main className="main">
          <Dashboard />
        </main>
      </div>
    </Providers>
  );
}
