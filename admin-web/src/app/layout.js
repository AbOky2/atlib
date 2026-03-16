import "./globals.css";

export const metadata = {
  title: "Atlib — Dashboard Restaurant",
  description: "Tableau de bord de gestion des commandes pour les restaurants Atlib",
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
