import React from 'react';
import { Shield } from 'lucide-react';

const PrivacyPolicy = () => {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm">
                <div className="flex items-center space-x-3 mb-8">
                    <Shield className="h-8 w-8 text-indigo-600" />
                    <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
                </div>

                <div className="space-y-6 text-gray-600">
                    <p className="text-sm text-gray-500">Last Updated: March 2026</p>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
                        <p>Welcome to Gavith IT Maradi App ("we," "our," or "us"). We respect your privacy and are committed to protecting it through our compliance with this policy. This policy describes the types of information we may collect from you or that you may provide when you use our mobile application and backend services.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
                        <p>We collect information from and about users of our App, including:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li><strong>Personal Information:</strong> Name, email address, phone number, and company name provided during registration.</li>
                            <li><strong>Device Information:</strong> We may collect information about your mobile device and internet connection.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-indigo-600 mb-3">3. Camera and Photo Library Access</h2>
                        <p>Our application requires access to your device's <strong>Camera</strong> and <strong>Photo Library</strong>. This access is strictly used for the following internal business purposes:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li><strong>Inventory Management:</strong> Capturing images of new stock, items, and related documentation to upload securely to our internal servers.</li>
                            <li><strong>Data Storage:</strong> Images you take using the app are uploaded and stored securely on our AWS S3 servers for cataloging and administrative review.</li>
                        </ul>
                        <p className="mt-2 text-sm bg-indigo-50 p-3 rounded-md border border-indigo-100">
                            We do <strong>not</strong> use the camera or photo library to collect personal data without your explicit consent, and we do not scan or access photos in your library other than the ones you explicitly choose to upload to the application.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">4. How We Use Your Information</h2>
                        <p>We use information that we collect about you or that you provide to us:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>To provide you with the App and its contents.</li>
                            <li>To fulfill any other purpose for which you provide it (e.g., fulfilling wholesale orders).</li>
                            <li>To carry out our obligations and enforce our rights arising from any contracts entered into between you and us, including for billing and collection.</li>
                            <li>To notify you about changes to our App or any products or services we offer.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Security</h2>
                        <p>We have implemented measures designed to secure your personal information from accidental loss and from unauthorized access, use, alteration, and disclosure. All information you provide to us is stored on our secure servers behind firewalls. Passwords are securely hashed, and session management is handled via secure tokens.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Contact Information</h2>
                        <p>To ask questions or comment about this privacy policy and our privacy practices, contact us via your official administrative channels.</p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
