import { ArrowLeft } from 'lucide-react';

export function TermsOfService() {
    return (
        <div className="min-h-screen bg-black text-white font-sans overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-12 md:py-20">

                <button
                    onClick={() => window.location.href = '/'}
                    className="mb-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={20} />
                    <span>Back to Home</span>
                </button>

                <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Terms of Service</h1>
                <p className="text-gray-400 mb-10 text-sm">Last updated: {new Date().toLocaleDateString()}</p>

                <div className="space-y-8 text-gray-300 leading-relaxed">

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
                        <p>
                            By accessing and using AI-Coach (the "Service"), you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services. Any participation in this service will constitute acceptance of this agreement. If you do not agree to abide by the above, please do not use this service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">2. Description of Service</h2>
                        <p>
                            AI-Coach provides users with AI-generated training plans, health metric analysis, and performance tracking based on data explicitly provided by the user or imported via supported third-party integrations (e.g., Garmin Connect).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">3. Medical Disclaimer</h2>
                        <p className="font-medium text-red-400 mb-2">
                            The Service does not provide medical advice.
                        </p>
                        <p>
                            The AI-generated advice, training plans, and analysis provided by the Service are for informational and educational purposes only. They are not intended, and should not be construed, as professional medical advice, diagnosis, or treatment. Always consult with a qualified healthcare provider before starting any new diet, fitness program, or training regimen, especially if you have pre-existing health conditions.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">4. User Accounts</h2>
                        <p>
                            To use certain features of the Service, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete. You are responsible for safeguarding your password and for all activities that occur under your account.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">5. Third-Party Integrations</h2>
                        <p>
                            The Service may allow you to connect your account to third-party services (e.g., Garmin, Strava). By connecting these services, you grant us permission to access, store, and use the data provided by these services as described in our Privacy Policy. We are not responsible for the accuracy or availability of data provided by third parties.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">6. Intellectual Property</h2>
                        <p>
                            The Service and its original content, features, and functionality are and will remain the exclusive property of AI-Coach and its licensors. The Service is protected by copyright, trademark, and other laws. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of AI-Coach.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">7. Termination</h2>
                        <p>
                            We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">8. Changes to Terms</h2>
                        <p>
                            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
                        </p>
                    </section>

                </div>
            </div>
        </div>
    );
}
