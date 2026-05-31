import { LegalLayout } from "./LegalLayout";

export default function Privacy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      lastUpdated="May 31, 2026"
      intro="This Privacy Policy explains what information IndicatorHub collects when you use our website and service, how we use and share it, and the choices you have. IndicatorHub is a personal stock-signal tool: you build combinations of technical indicators, keep a watchlist of tickers, and receive a daily email digest when your conditions are met."
    >
      <section>
        <h2>
          <span className="num">01</span> Scope
        </h2>
        <p>
          This policy applies to <strong>indicatorhub.dev</strong> and the
          IndicatorHub application (the “Service”). It does not apply to
          third-party websites or services we link to, or to the practices of
          companies we do not control. By using the Service, you agree to the
          collection and use of information as described here.
        </p>
      </section>

      <section>
        <h2>
          <span className="num">02</span> Information We Collect
        </h2>

        <h3>Information you provide</h3>
        <ul>
          <li>
            <strong>Account information.</strong> You sign in with Google. We
            receive your name, email address, and profile avatar from Google so
            we can create and identify your account. We do not receive or store
            your Google password.
          </li>
          <li>
            <strong>Preferences.</strong> Settings you choose, such as your time
            zone, interface language, and whether you want the daily email
            digest.
          </li>
          <li>
            <strong>Your content.</strong> The tickers on your watchlist, the
            indicator combinations (“combos”) you create, and the indicators you
            add to your personal library.
          </li>
          <li>
            <strong>Communications.</strong> Messages you send us for support or
            feedback.
          </li>
        </ul>

        <h3>Information collected automatically</h3>
        <ul>
          <li>
            <strong>Local storage and essential cookies.</strong> We use your
            browser’s local storage to keep you signed in and to cache data
            (such as your dashboard and watchlist) so the app loads faster. These
            are essential to the Service; we do not use advertising or
            cross-site tracking cookies.
          </li>
          <li>
            <strong>Log and device data.</strong> Like most websites, our
            hosting and infrastructure providers automatically record basic
            technical information such as IP address, browser type, and request
            timestamps for security and reliability.
          </li>
        </ul>

        <h3>Information from third parties</h3>
        <p>
          When you sign in with Google, Google shares the basic profile
          information described above in accordance with your Google account
          settings and Google’s privacy policy.
        </p>
      </section>

      <section>
        <h2>
          <span className="num">03</span> How We Use Information
        </h2>
        <ul>
          <li>Provide, operate, and maintain your account and the Service.</li>
          <li>
            Evaluate your indicator combos against market data and show you the
            results on your dashboard and watchlist.
          </li>
          <li>
            Send the daily pre-market email digest when you have opted in, and
            send essential service messages (for example, account or security
            notices).
          </li>
          <li>Respond to your support requests and feedback.</li>
          <li>
            Monitor, secure, debug, and improve the Service, and prevent abuse.
          </li>
          <li>Comply with legal obligations and enforce our terms.</li>
        </ul>
      </section>

      <section>
        <h2>
          <span className="num">04</span> Email Communications
        </h2>
        <p>
          The daily digest is optional. You can turn it off at any time from the
          <strong> Notifications</strong> section of your Settings, or by using
          the unsubscribe link at the bottom of any digest email. We may still
          send you essential, non-promotional messages related to your account
          and security, which you cannot opt out of while you have an account.
        </p>
      </section>

      <section>
        <h2>
          <span className="num">05</span> How We Share Information
        </h2>
        <p>
          We do not sell your personal information. We share it only as follows:
        </p>
        <ul>
          <li>
            <strong>Service providers</strong> who process data on our behalf,
            under contract, including: <strong>Supabase</strong> (authentication
            and database hosting), <strong>Resend</strong> (sending email),{" "}
            <strong>Google</strong> (sign-in), and our cloud hosting provider.
            These providers may process data outside your country.
          </li>
          <li>
            <strong>Legal and safety</strong> reasons — to comply with
            applicable law, legal process, or lawful requests, or to protect the
            rights, property, and safety of our users, the public, or
            IndicatorHub.
          </li>
          <li>
            <strong>Business transfers</strong> — in connection with a merger,
            acquisition, financing, or sale of assets, your information may be
            transferred as part of that transaction.
          </li>
        </ul>
      </section>

      <section>
        <h2>
          <span className="num">06</span> Market Data
        </h2>
        <p>
          To evaluate your indicators, the Service retrieves and caches public
          market data (such as end-of-day prices and security listings) from
          third-party data sources. This market data is not your personal
          information. It is provided for informational purposes and may be
          delayed, incomplete, or inaccurate — see our{" "}
          <a href="/terms">Terms of Service</a>.
        </p>
      </section>

      <section>
        <h2>
          <span className="num">07</span> Data Retention
        </h2>
        <p>
          We keep your account information and content for as long as your
          account is active or as needed to provide the Service. When you delete
          your account, your associated data — including preferences, watchlist,
          combos, indicator library, and email logs — is removed. We may retain
          limited information where required to comply with legal obligations,
          resolve disputes, or enforce our agreements.
        </p>
      </section>

      <section>
        <h2>
          <span className="num">08</span> Security
        </h2>
        <p>
          We take reasonable technical and organizational measures to protect
          your information. Data is transmitted over encrypted connections, user
          data is stored with row-level access controls, and access is scoped to
          each account. No method of transmission or storage is completely
          secure, however, and we cannot guarantee absolute security.
        </p>
      </section>

      <section>
        <h2>
          <span className="num">09</span> Your Rights and Choices
        </h2>
        <ul>
          <li>
            <strong>Access and update.</strong> View and change your preferences
            from your Settings, and your watchlist and combos from within the
            app.
          </li>
          <li>
            <strong>Delete.</strong> Permanently delete your account and
            associated data at any time from Settings.
          </li>
          <li>
            <strong>Email choices.</strong> Opt out of the daily digest as
            described above.
          </li>
        </ul>
        <p>
          Depending on where you live (for example, the EEA, UK, or California),
          you may have additional rights, such as the right to access, correct,
          delete, or port your personal information, to object to or restrict
          certain processing, or to withdraw consent. To exercise these rights,
          contact us at the address below. We will not discriminate against you
          for exercising your rights.
        </p>
      </section>

      <section>
        <h2>
          <span className="num">10</span> International Transfers
        </h2>
        <p>
          IndicatorHub and our service providers operate in the United States
          and other countries. If you access the Service from outside these
          regions, your information may be transferred to, stored, and processed
          in a country whose data-protection laws differ from those of your own.
        </p>
      </section>

      <section>
        <h2>
          <span className="num">11</span> Children’s Privacy
        </h2>
        <p>
          The Service is not directed to, and is not intended for, anyone under
          18 years of age, and we do not knowingly collect personal information
          from children. If you believe a child has provided us with personal
          information, please contact us and we will delete it.
        </p>
      </section>

      <section>
        <h2>
          <span className="num">12</span> Changes to This Policy
        </h2>
        <p>
          We may update this Privacy Policy from time to time. When we do, we
          will revise the “Last updated” date above, and for material changes we
          will provide a more prominent notice. Your continued use of the
          Service after changes take effect constitutes acceptance of the
          updated policy.
        </p>
      </section>

      <section>
        <h2>
          <span className="num">13</span> Contact Us
        </h2>
        <p>
          If you have questions about this Privacy Policy or how we handle your
          information, contact us at{" "}
          <a href="mailto:hello@indicatorhub.dev">hello@indicatorhub.dev</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
