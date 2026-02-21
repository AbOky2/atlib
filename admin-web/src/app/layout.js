import "./globals.css";

export const metadata = {
  title: "Bordeaux Date Admin",
  description: "Restaurant dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        {children}
      </body>
    </html>
  );
}
