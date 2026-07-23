export const metadata = {
  title: "Privacy Policy | Conference Management",
};

export default function PrivacyPage() {
  return (
    <div className="bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
          Conference Management collects and processes personal data in accordance with applicable
          data protection laws. Information submitted through registration forms, paper
          submissions, and account creation is used for conference administration purposes.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          For questions about how your data is handled, contact the support team via the{" "}
          <a href="/contact" className="text-primary hover:underline">
            contact page
          </a>
          .
        </p>
      </div>
    </div>
  );
}
