// src/app/privacy/page.tsx
export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-rose-50 p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-500 mb-6">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-6 text-gray-700 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              🔒 Our Promise
            </h2>
            <p>
              BadreDrop is built privacy-first. We collect nothing. We store
              nothing. We know nothing about you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              What We Collect
            </h2>
            <p className="font-semibold">Nothing.</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>No phone number</li>
              <li>No email address</li>
              <li>No name</li>
              <li>No contacts</li>
              <li>No location</li>
              <li>No device information beyond what your browser sends</li>
              <li>No message or file content</li>
              <li>No metadata about who talks to whom</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              How File Transfer Works
            </h2>
            <p>
              Files are transferred directly between devices using WebRTC — a
              peer-to-peer technology. Your files never touch our servers. They
              go from your device directly to the recipient&apos;s device,
              encrypted end-to-end.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Supabase Signaling
            </h2>
            <p>
              We use Supabase Realtime only to help devices find each other for
              the initial connection. Once connected, all data flows
              peer-to-peer. Supabase does not store any file content or
              messages. Signaling data is temporary and deleted immediately
              after connection.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Local Storage
            </h2>
            <p>
              We use your browser&apos;s local storage to remember your device
              name and preferences. This data stays on your device and is never
              sent anywhere.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Children&apos;s Privacy
            </h2>
            <p>
              BadreDrop is not intended for users under 13. We do not knowingly
              collect information from children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Changes
            </h2>
            <p>
              If we ever change this policy, we will update the date above. By
              continuing to use BadreDrop, you accept the current policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Contact
            </h2>
            <p>
              Built by Badre, a Nepali worker in KSA, with tired hands and big
              dreams. Questions? Find me on Twitter.
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