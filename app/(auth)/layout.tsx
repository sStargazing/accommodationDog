export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="flex flex-1 items-start justify-center bg-muted/40 px-4 py-12 sm:items-center sm:py-16">
      {children}
    </main>
  );
}
