// src/app/terms/page.tsx
export default function TermsOfService() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-rose-50 p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-gray-500 mb-6">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-6 text-gray-700 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              1. Acceptance
            </h2>
            <p>
              By using BadreDrop, you agree to these terms. If you don&apos;t
              agree, please don&apos;t use the app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              2. Age Requirement
            </h2>
            <p>
              You must be at least 13 years old to use BadreDrop. If you are
              under 13, please do not use this app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              3. What You Can Do
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Transfer files between your own devices</li>
              <li>Transfer files with people you trust</li>
              <li>Use it for personal or professional purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              4. What You Cannot Do
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Send illegal content (child abuse material, terrorist content, etc.)</li>
              <li>Send malware, viruses, or harmful files</li>
              <li>Harass, threaten, or harm others</li>
              <li>Impersonate others</li>
              <li>Violate any local, national, or international law</li>
              <li>Use the app for fraud or scams</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              5. Your Responsibility
            </h2>
            <p>
              You are solely responsible for what you send and receive. BadreDrop
              is a tool — like a pen or a phone. We do not monitor, store, or
              see your files. We cannot be held responsible for what you do
              with the app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              6. No Warranty
            </h2>
            <p>
              BadreDrop is provided &quot;as is&quot; without warranty of any kind. We do
              not guarantee that it will work perfectly, be error-free, or meet
              your specific needs. Use at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              7. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, BadreDrop and its creator
              (Badre) shall not be liable for any damages arising from the use
              or inability to use this app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              8. Blocking
            </h2>
            <p>
              You can block any device you don&apos;t want to connect with. Blocked
              devices cannot reach you again.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              9. Termination
            </h2>
            <p>
              We reserve the right to discontinue the service at any time.
              Since we hold no user data, there is nothing to delete.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              10. Changes
            </h2>
            <p>
              We may update these terms. Continued use means acceptance of the
              updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              11. Contact
            </h2>
            <p>
              Built by Badre, a Nepali worker in KSA. Questions? Find me on
              Twitter.
            </p>
          </section>
        </div>

        <a
          href="/"
          className="inline-block mt-8 px-6 py-3 bg-rose-600 text-white rounded-xl font-semibold"
        >
          ← Back to BadreDrop
        </a>
      </div>
    </main>
  );
}