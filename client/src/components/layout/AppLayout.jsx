import { Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="p-4 border-b">
        <h1 className="text-xl font-bold">Peer Pulse Study Hub</h1>
      </header>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
}
