import { Button } from "./ui/button";

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-muted/30">
            <h1 className="text-6xl font-bold mb-4">404</h1>
            <p className="text-lg mb-8">The page you are looking for does not exist.</p>
            <Button variant="primary" onClick={() => window.location.href = '/'}>Go to Dashboard</Button>
        </div>
    );
}
