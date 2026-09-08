import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Download,
  FileText,
  Headphones,
  Mail,
  Printer,
  RefreshCw,
  Scale,
  ShieldCheck,
} from 'lucide-react';

const EFFECTIVE_DATE = '21 August 2026';
const SUPPORT_EMAIL = 'support@gobook.app';

const DOCUMENTS = {
  terms: {
    title: 'Terms & Conditions',
    eyebrow: 'GoBook Suite',
    icon: FileText,
    intro: 'These Terms & Conditions govern your access to and use of GoBook Suite, operated by Gobright.',
    notice: 'By creating an account, purchasing a subscription, clicking an acceptance button, accessing the software or using GoBook Suite, you acknowledge that you have read and agreed to these Terms.',
    sections: [
      {
        heading: '1. Eligibility',
        body: 'Users must be legally capable of entering into a contract under applicable Indian law. Where a user accesses GoBook Suite on behalf of an organisation, the user represents that they have authority to act on behalf of that organisation.',
      },
      {
        heading: '2. User Account',
        body: 'Users must provide accurate information when registering.',
        bullets: [
          'Maintaining confidentiality of login credentials',
          'Controlling authorised employee access',
          'Activities performed through their accounts',
          'Informing GoBook Suite about suspected unauthorised access.',
        ],
      },
      {
        heading: '3. Software Licence',
        body: 'Subject to payment of applicable charges and compliance with these Terms, users receive a limited, non-exclusive, non-transferable and revocable right to access and use GoBook Suite for authorised business purposes. No ownership of the software is transferred to the user.',
      },
      {
        heading: '4. Acceptable Use',
        body: 'Users shall not:',
        bullets: [
          'Use GoBook Suite for unlawful activity',
          "Access another customer's account without permission",
          'Attempt to bypass security controls',
          'Introduce malicious software',
          'Interfere with servers or networks',
          'Misuse third-party personal information',
          'Copy or commercially redistribute GoBook Suite without authorisation',
          'Attempt unauthorised reverse engineering except where permitted by applicable law.',
        ],
      },
      {
        heading: '5. Customer Data',
        body: 'Customers retain their rights in data entered into GoBook Suite. Customers are responsible for the accuracy, legality and authorisation of the data they upload. GoBook Suite may process customer data as necessary to provide, maintain, secure and support the subscribed services.',
      },
      {
        heading: '6. Subscription and Payment',
        body: 'Features may be provided under free, trial or paid plans. Applicable:',
        bullets: [
          'Subscription price',
          'Billing period',
          'Taxes',
          'Renewal conditions',
          'Included features',
          'User limits',
          'Usage limits',
        ],
        after: 'will be displayed or communicated before purchase. Applicable GST and other statutory taxes may be charged in accordance with Indian law.',
      },
      {
        heading: '7. Cancellation and Refund',
        body: 'Customers may cancel subscriptions in accordance with the cancellation conditions communicated for the selected plan. Unless otherwise expressly stated in the applicable quotation, order or subscription plan, payments already made may be non-refundable after activation of the subscribed service, except where a refund is required under applicable law or expressly approved by GoBook Suite. Your actual commercial refund policy should be inserted here before publishing.',
      },
      {
        heading: '8. Intellectual Property',
        body: 'GoBook Suite software, source code, interfaces, designs, documentation, logos, brand elements and associated intellectual property belong to their respective lawful owner or licensor. Nothing contained in these Terms transfers intellectual-property ownership to the customer.',
      },
      {
        heading: '9. Service Availability',
        body: 'We endeavour to maintain reliable availability but cannot guarantee that GoBook Suite will operate continuously or without interruption. Temporary interruptions may occur because of:',
        bullets: [
          'Scheduled maintenance',
          'Software upgrades',
          'Security updates',
          'Internet failures',
          'Cloud infrastructure failures',
          'Third-party services',
          'Force-majeure events.',
        ],
      },
      {
        heading: '10. Third-Party Services',
        body: 'Some GoBook Suite features may rely upon payment gateways, cloud providers, messaging services or other integrations. Use of those services may additionally be subject to their respective terms and privacy policies.',
      },
      {
        heading: '11. Suspension and Termination',
        body: 'We may suspend or terminate access in cases including:',
        bullets: [
          'Non-payment',
          'Fraud',
          'Security threats',
          'Illegal activity',
          'Material violation of these Terms',
          'Serious misuse of the platform.',
        ],
      },
      {
        heading: '12. Limitation of Liability',
        body: 'To the extent permitted by applicable Indian law, GoBook Suite and its proprietor shall not be responsible for indirect, incidental or consequential losses resulting from use of the platform, loss of internet connectivity, third-party failures or circumstances beyond reasonable control. Nothing in these Terms excludes any right or liability that cannot lawfully be excluded.',
      },
      {
        heading: '13. Consumer Rights',
        body: "Nothing in these Terms is intended to restrict statutory rights available to eligible consumers under applicable Indian consumer-protection law. India's E-Commerce Rules apply to goods and services bought or sold over digital or electronic networks, including digital products, where the transaction falls within their scope.",
      },
      {
        heading: '14. Privacy',
        body: 'Use of GoBook Suite is also governed by our Privacy Policy.',
      },
      {
        heading: '15. Governing Law',
        body: 'These Terms shall be governed by the laws of India. Subject to applicable law, disputes relating to these Terms shall be subject to the jurisdiction of competent courts at Tiruchirappalli, Tamil Nadu, India.',
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    eyebrow: 'GoBook Suite',
    icon: ShieldCheck,
    intro: 'GoBook Suite ("GoBook", "we", "our", or "us") is a business software platform operated by E SUDHAKAR, Proprietor of GOBRIGHT, having its principal place of business at 1st Floor, 52/B, Paradise Tower Complex, Thennur High Road, Opp. to Shaans Hotel, Thennur, Tiruchirappalli, Tamil Nadu - 620017, India.',
    notice: 'This Privacy Policy explains how we collect, use, process, store, protect and disclose personal and business information when you access or use the GoBook Suite website, software, applications or related services.',
    sections: [
      {
        heading: '1. Legal Framework',
        body: 'This policy is intended to operate in accordance with applicable Indian laws, including the Information Technology Act, 2000, applicable Information Technology rules concerning personal and sensitive information and, as applicable from their respective commencement dates, the Digital Personal Data Protection Act, 2023 and Digital Personal Data Protection Rules, 2025. The main DPDP provisions concerning notice, consent, processing obligations and individual rights have a phased commencement and are scheduled to become effective 18 months from 13 November 2025.',
      },
      {
        heading: '2. Information We Collect',
        body: 'Depending on the services used, GoBook Suite may collect:',
        bullets: [
          'Name',
          'Mobile number',
          'Email address',
          'Business or organisation name',
          'Business address',
          'Login and account information',
          'User role and permissions',
          'Billing and subscription information',
          'Customer information entered into the software',
          'Supplier information',
          'Employee information',
          'Invoice, quotation and transaction details',
          'Inventory and product details',
          'Tax and GST-related information entered by users',
          'Device and browser information',
          'IP address',
          'Login history',
          'Usage and activity logs',
          'Support communications',
          'Information submitted through contact forms',
          'Other information voluntarily provided by users.',
        ],
      },
      {
        heading: '3. Purpose of Collection',
        body: 'Information may be collected and processed to:',
        bullets: [
          'Create and maintain user accounts',
          'Provide GoBook Suite software services',
          'Enable billing, inventory, CRM and business-management functionality',
          'Authenticate and secure user accounts',
          'Process subscriptions and payments',
          'Provide technical and customer support',
          'Generate reports requested by users',
          'Maintain audit and activity records',
          'Prevent misuse, fraud and unauthorised access',
          'Improve platform functionality and security',
          'Send important service notifications',
          'Comply with applicable legal, taxation and regulatory requirements.',
        ],
      },
      {
        heading: '4. Business Data',
        body: 'Customers may enter information relating to their customers, employees, suppliers, products, invoices and other business activities into GoBook Suite. The customer is responsible for ensuring that it has appropriate authority to collect and submit such information to GoBook Suite. Where we process information on behalf of a business customer, we will use such information primarily for providing and supporting the services requested by that customer.',
      },
      {
        heading: '5. Consent',
        body: 'Where consent is legally required, information will be processed based on valid consent or another ground permitted under applicable Indian law. Users may request withdrawal of consent where applicable, subject to legal, contractual and operational requirements. The DPDP Act establishes a framework covering notice, consent, lawful processing, correction, erasure and grievance rights once the respective provisions become operative.',
      },
      {
        heading: '6. Sharing of Information',
        body: 'We may share information with service providers necessary for operating GoBook Suite, including:',
        bullets: [
          'Cloud and hosting providers',
          'Payment gateway providers',
          'Email/SMS/communication providers',
          'Security providers',
          'Backup providers',
          'Technical service providers',
          'Analytics providers',
          'Professional advisers.',
        ],
        after: "We may also disclose information where required by law, judicial order or a lawful request from an authorised government or regulatory authority. We do not sell users' personal information.",
      },
      {
        heading: '7. Data Security',
        body: 'We take reasonable technical and organisational precautions to protect information from unauthorised access, loss, misuse, alteration or disclosure. Measures may include authentication controls, restricted administrative access, encrypted communications where appropriate, security monitoring and backups. The existing IT/SPDI framework requires applicable businesses handling sensitive personal data to maintain reasonable security practices and a privacy policy.',
      },
      {
        heading: '8. Data Retention',
        body: 'Information will be retained for as long as reasonably necessary to:',
        bullets: [
          'Provide GoBook Suite services',
          'Maintain legitimate business records',
          'Meet GST, taxation, accounting or regulatory obligations',
          'Resolve disputes',
          'Prevent fraud',
          'Maintain security records',
          'Fulfil contractual obligations.',
        ],
        after: 'Information that is no longer required may be deleted, anonymised or securely disposed of, subject to applicable law.',
      },
      {
        heading: '9. Data Correction and Deletion',
        body: 'Users may request correction, updating or deletion of eligible personal information by contacting us. Certain information may be retained where retention is required under taxation, accounting, contractual, fraud-prevention, dispute-resolution or other applicable legal requirements.',
      },
      {
        heading: '10. Cookies and Technical Technologies',
        body: 'GoBook Suite may use cookies, session storage and similar technologies for:',
        bullets: [
          'Authentication',
          'Security',
          'Session management',
          'User preferences',
          'Software functionality',
          'Performance analysis.',
        ],
      },
      {
        heading: "11. Children's Information",
        body: 'GoBook Suite is primarily intended for businesses and authorised business users and is not intended to be directly used by children.',
      },
      {
        heading: '12. Changes to this Policy',
        body: 'We may revise this Privacy Policy to reflect changes in our services, technology or applicable law. The latest version will be published on our website with an updated effective date.',
      },
      {
        heading: '13. Privacy / Grievance Contact',
        body: 'Business Operator: E SUDHAKAR. Business / Trade Name: GOBRIGHT. Brand: GoBook Suite. Address: 1st Floor, 52/B, Paradise Tower Complex, Thennur High Road, Opp. to Shaans Hotel, Thennur, Tiruchirappalli, Tamil Nadu - 620017, India. Privacy / Grievance Email: support.gobook@gmail.com. Support Phone: 8925550775.',
      },
    ],
  },
};

export function LegalPage({ type }) {
  const { documentType } = useParams();
  const selectedType = type || documentType;
  const document = DOCUMENTS[selectedType];

  if (!document) return <Navigate to="/terms" replace />;

  if (selectedType === 'terms' || selectedType === 'privacy') {
    return (
      <main className="min-h-screen bg-[#f6f9fd] px-4 py-6 text-[#102044] sm:px-6 lg:px-8">
        <article className="mx-auto max-w-5xl overflow-hidden rounded-[8px] border border-[#d9e4f2] bg-white shadow-[0_22px_70px_rgba(15,45,84,0.08)]">
          <header className="border-b border-[#e2ebf5] bg-gradient-to-br from-white to-[#f1f7ff] px-5 py-6 sm:px-8 sm:py-8">
            <Link to="/login" className="mb-6 inline-flex items-center gap-2 text-[13px] font-bold text-[#1268ff] no-underline hover:underline">
              <ArrowLeft size={16} />
              Back to Login
            </Link>

            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="m-0 text-[12px] font-black uppercase tracking-[0.08em] text-[#1268ff]">GoBook Suite</p>
                <h1 className="m-0 mt-2 text-[32px] font-black leading-tight text-[#071b4d] sm:text-[42px]">{document.title}</h1>
                <p className="m-0 mt-3 text-[14px] font-semibold text-[#64728f]">Effective Date: {EFFECTIVE_DATE}</p>
              </div>

              <img src="/gobook-logo-full.png" alt="GoBook Suite" className="h-11 w-max object-contain sm:h-12" />
            </div>
          </header>

          <div className="px-5 py-6 sm:px-8 sm:py-8">
            <section className="rounded-[8px] border border-[#d9e8ff] bg-[#f5f9ff] p-5">
              <p className="m-0 text-[16px] leading-7 text-[#20345f]">{document.intro}</p>
              <p className="m-0 mt-4 text-[16px] font-semibold leading-7 text-[#102044]">{document.notice}</p>
            </section>

            <div className="mt-7 grid gap-4">
              {document.sections.map((section) => {
                const match = section.heading.match(/^(\d+)\.\s*(.+)$/);
                const number = match?.[1]?.padStart(2, '0');
                const label = match?.[2] || section.heading;

                return (
                  <section key={section.heading} className="grid gap-4 rounded-[8px] border border-[#e2ebf5] bg-white p-5 sm:grid-cols-[56px_minmax(0,1fr)]">
                    {number && <span className="inline-flex h-11 w-12 items-center justify-center rounded-[8px] bg-[#eaf2ff] text-[17px] font-black text-[#1268ff]">{number}</span>}
                    <div>
                      <h2 className="m-0 text-[19px] font-black text-[#071b4d]">{label}</h2>
                      <p className="m-0 mt-2 text-[15px] leading-7 text-[#465778]">{section.body}</p>
                      {section.bullets && (
                        <ul className="m-0 mt-3 space-y-1.5 pl-5 text-[15px] leading-7 text-[#465778] marker:text-[#1268ff]">
                          {section.bullets.map((bullet) => (
                            <li key={bullet}>{bullet}</li>
                          ))}
                        </ul>
                      )}
                      {section.after && <p className="m-0 mt-3 text-[15px] leading-7 text-[#465778]">{section.after}</p>}
                    </div>
                  </section>
                );
              })}
            </div>

            <footer className="mt-8 border-t border-[#e2ebf5] pt-5 text-[13px] leading-6 text-[#64728f]">
              For questions about this {selectedType === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'} page, contact <a className="font-bold text-[#1268ff] no-underline hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </footer>
          </div>
        </article>
      </main>
    );
  }

  const tocItems = document.sections.map((section, index) => {
    const match = section.heading.match(/^(\d+)\.\s*(.+)$/);
    const number = match?.[1] || String(index + 1);
    const label = match?.[2] || section.heading;
    return {
      id: `section-${number}`,
      number: number.padStart(2, '0'),
      tocNumber: number,
      label,
      section,
    };
  });

  function handlePrint() {
    window.print();
  }

  return (
    <main className="min-h-screen bg-[#f8fbff] text-[#071b4d]">
      <header className="sticky top-0 z-20 border-b border-[#dbe5f3] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1460px] items-center justify-between gap-6 px-5 py-4 lg:px-10">
          <Link to="/terms" className="flex items-center gap-3 no-underline">
            <img src="/gobook-logo-full.png" alt="GoBook Suite" className="h-11 w-auto object-contain" />
          </Link>

          <nav className="hidden items-center gap-8 text-[14px] font-semibold text-[#071b4d] md:flex">
            <Link to="/terms" className={`border-b-2 px-1 py-5 no-underline ${selectedType === 'terms' ? 'border-[#1268ff] text-[#075cff]' : 'border-transparent text-[#071b4d] hover:text-[#075cff]'}`}>Legal Center</Link>
            <Link to="/privacy" className={`border-b-2 px-1 py-5 no-underline ${selectedType === 'privacy' ? 'border-[#1268ff] text-[#075cff]' : 'border-transparent text-[#071b4d] hover:text-[#075cff]'}`}>Privacy Policy</Link>
            <a href="#refund-policy" className="border-b-2 border-transparent px-1 py-5 text-[#071b4d] no-underline hover:text-[#075cff]">Refund Policy</a>
            <a href="#cookie-policy" className="border-b-2 border-transparent px-1 py-5 text-[#071b4d] no-underline hover:text-[#075cff]">Cookie Policy</a>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="border-b-2 border-transparent px-1 py-5 text-[#071b4d] no-underline hover:text-[#075cff]">Contact Us</a>
          </nav>

          <Link to="/login" className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-[#1268ff] px-5 text-[14px] font-bold text-white no-underline shadow-[0_14px_30px_rgba(18,104,255,0.2)]">
            <ArrowLeft size={17} />
            Back to Login
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1360px] px-5 py-7 lg:px-10">
        <Link to="/login" className="mb-5 inline-flex items-center gap-2 text-[14px] font-bold text-[#075cff] no-underline hover:underline">
          <ArrowLeft size={17} />
          Back to Login
        </Link>

        <section className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
          <aside className="order-2 lg:order-1">
            <div className="sticky top-28 rounded-[8px] border border-[#dbe5f3] bg-white p-4 shadow-sm">
              <p className="m-0 mb-4 text-[12px] font-black uppercase text-[#1a3767]">On This Page</p>
              <nav className="grid gap-1">
                {tocItems.map((item, index) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={`rounded-[7px] px-3 py-2 text-[13px] font-semibold no-underline ${index === 0 ? 'bg-[#eaf2ff] text-[#075cff]' : 'text-[#17325f] hover:bg-[#f2f6fd] hover:text-[#075cff]'}`}
                  >
                    {item.tocNumber}.&nbsp; {item.label}
                  </a>
                ))}
              </nav>
              <div className="mt-5 border-t border-dashed border-[#d3deed] pt-4">
                <p className="m-0 text-[12px] leading-5 text-[#6b7b99]">Click any section to jump to that part.</p>
              </div>
            </div>
          </aside>

          <div className="order-1 min-w-0 lg:order-2">
            <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <p className="m-0 text-[12px] font-black uppercase tracking-[0.04em] text-[#075cff]">Legal Center</p>
                <h1 className="m-0 mt-5 text-[42px] font-black leading-tight text-[#061844] sm:text-[52px]">{document.title}</h1>
                <p className="m-0 mt-3 text-[15px] text-[#546486]">{selectedType === 'terms' ? 'Rules and guidelines for using GoBook Suite.' : document.intro}</p>
                <div className="mt-5 flex flex-wrap items-center gap-4 text-[13px] font-semibold text-[#546486]">
                  <span className="inline-flex items-center gap-2"><CalendarDays size={15} /> Effective Date: {EFFECTIVE_DATE}</span>
                  <span aria-hidden="true">•</span>
                  <span className="inline-flex items-center gap-2"><RefreshCw size={15} /> Last Updated: {EFFECTIVE_DATE}</span>
                  <span aria-hidden="true">•</span>
                  <span>Version 1.0</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={handlePrint} className="inline-flex h-11 items-center gap-2 rounded-[7px] border border-[#cbd9ee] bg-white px-4 text-[13px] font-bold text-[#075cff]">
                  <Download size={17} />
                  Download PDF
                </button>
                <button type="button" onClick={handlePrint} className="inline-flex h-11 items-center gap-2 rounded-[7px] border border-[#cbd9ee] bg-white px-4 text-[13px] font-bold text-[#075cff]">
                  <Printer size={17} />
                  Print
                </button>
              </div>
            </div>

            <section className="rounded-[8px] border border-[#dbe5f3] bg-white p-5 shadow-sm sm:p-7">
              {document.notice && (
                <div className="mb-7 flex gap-5 rounded-[8px] border border-[#9fc1ff] bg-[#f1f7ff] p-5 text-[#102b5d]">
                  <span className="inline-flex h-14 w-14 flex-none items-center justify-center rounded-full bg-[#e4f0ff] text-[#075cff]">
                    <ShieldCheck size={30} />
                  </span>
                  <p className="m-0 text-[16px] font-bold leading-7">{document.notice}</p>
                </div>
              )}

              <p className="m-0 border-b border-[#dbe5f3] pb-6 text-[15px] leading-7 text-[#3e4f77]">{document.intro}</p>

              <div className="divide-y divide-[#dbe5f3]">
                {tocItems.map((item) => (
                  <section id={item.id} key={item.id} className="grid scroll-mt-28 gap-5 py-7 sm:grid-cols-[54px_minmax(0,1fr)]">
                    <span className="inline-flex h-10 w-12 items-center justify-center rounded-[8px] bg-[#eaf2ff] text-[18px] font-black text-[#075cff]">{item.number}</span>
                    <div>
                      <h2 className="m-0 text-[21px] font-black text-[#061844]">{item.label}</h2>
                      <p className="m-0 mt-3 text-[15px] leading-7 text-[#3e4f77]">{item.section.body}</p>
                      {item.section.bullets && (
                        <ul className="m-0 mt-3 space-y-2 pl-5 text-[15px] leading-7 text-[#3e4f77] marker:text-[#075cff]">
                          {item.section.bullets.map((bullet) => (
                            <li key={bullet}>{bullet}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          </div>

          <aside className="order-3">
            <div className="sticky top-28 grid gap-4">
              <section className="rounded-[8px] border border-[#dbe5f3] bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#eaf2ff] text-[#075cff]">
                    <FileText size={18} />
                  </span>
                  <h2 className="m-0 text-[13px] font-black uppercase text-[#1a3767]">Document Information</h2>
                </div>
                <dl className="m-0 grid gap-4 text-[13px]">
                  <div><dt className="font-black text-[#1a3767]">Document</dt><dd className="m-0 mt-1 text-[#516181]">{document.title}</dd></div>
                  <div><dt className="font-black text-[#1a3767]">Version</dt><dd className="m-0 mt-1 text-[#516181]">1.0</dd></div>
                  <div><dt className="font-black text-[#1a3767]">Effective Date</dt><dd className="m-0 mt-1 text-[#516181]">{EFFECTIVE_DATE}</dd></div>
                  <div><dt className="font-black text-[#1a3767]">Last Updated</dt><dd className="m-0 mt-1 text-[#516181]">{EFFECTIVE_DATE}</dd></div>
                  <div><dt className="font-black text-[#1a3767]">Language</dt><dd className="m-0 mt-1 text-[#516181]">English</dd></div>
                </dl>
                <div className="mt-5 flex gap-3 border-t border-dashed border-[#d3deed] pt-4">
                  <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#eaf2ff] text-[#075cff]">
                    <Scale size={19} />
                  </span>
                  <p className="m-0 text-[12px] leading-5 text-[#3f6ca8]">These terms are legally binding. Please read them carefully.</p>
                </div>
              </section>

              <section className="rounded-[8px] border border-[#dbe5f3] bg-white p-5 shadow-sm">
                <div className="flex gap-4">
                  <span className="inline-flex h-12 w-12 flex-none items-center justify-center rounded-full bg-[#eaf2ff] text-[#075cff]">
                    <Headphones size={24} />
                  </span>
                  <div>
                    <h2 className="m-0 text-[13px] font-black uppercase text-[#1a3767]">Need Help?</h2>
                    <p className="m-0 mt-2 text-[13px] leading-5 text-[#516181]">If you have any questions about these Terms & Conditions, our support team is here to help.</p>
                    <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-4 inline-flex h-9 items-center gap-2 rounded-[7px] border border-[#cbd9ee] px-4 text-[13px] font-bold text-[#075cff] no-underline">
                      <Mail size={15} />
                      Contact Support
                    </a>
                  </div>
                </div>
              </section>
            </div>
          </aside>
        </section>
      </div>

      <footer className="border-t border-[#dbe5f3] bg-white">
        <div className="mx-auto grid max-w-[1360px] gap-8 px-5 py-7 text-[13px] text-[#516181] lg:grid-cols-[220px_1fr_1fr_1fr_1.2fr] lg:px-10">
          <div><img src="/gobook-logo-full.png" alt="GoBook Suite" className="h-10 w-auto object-contain" /></div>
          <p className="m-0 leading-6">All-in-one business management platform to simplify your operations.</p>
          <div>
            <h3 className="m-0 mb-2 text-[12px] font-black uppercase text-[#1a3767]">Legal</h3>
            <Link to="/terms" className="block text-[#075cff] no-underline hover:underline">Terms & Conditions</Link>
            <Link to="/privacy" className="mt-1 block text-[#075cff] no-underline hover:underline">Privacy Policy</Link>
            <a id="refund-policy" href="#refund-policy" className="mt-1 block text-[#075cff] no-underline hover:underline">Refund Policy</a>
            <a id="cookie-policy" href="#cookie-policy" className="mt-1 block text-[#075cff] no-underline hover:underline">Cookie Policy</a>
          </div>
          <div>
            <h3 className="m-0 mb-2 text-[12px] font-black uppercase text-[#1a3767]">Company</h3>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="block text-[#075cff] no-underline hover:underline">Contact Us</a>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-1 block text-[#075cff] no-underline hover:underline">Support</a>
          </div>
          <p className="m-0 leading-6">&copy; 2026 GoBook Suite. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
