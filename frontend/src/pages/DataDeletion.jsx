import React from 'react';
import { Link } from 'react-router-dom';

export default function DataDeletion() {
  return (
    <div className="p-8 md:p-16 bg-[#030303] text-gray-300 min-h-screen font-sans">
      <div className="max-w-4xl mx-auto bg-[#111111] p-8 rounded-3xl border border-gray-800 shadow-2xl">
        <Link to="/" className="text-purple-400 hover:text-purple-300 text-sm font-bold mb-6 inline-block">← Back to Home</Link>
        
        <h1 className="text-4xl font-extrabold text-white mb-6">Data Deletion Instructions</h1>
        <p className="mb-4">Last Updated: {new Date().toLocaleDateString()}</p>
        
        <div className="space-y-6 text-sm md:text-base leading-relaxed">
          <section>
            <p>According to the Facebook Platform rules, we have to provide User Data Deletion Callback URL or Data Deletion Instructions URL. If you want to delete your activities for the DealClose AI App, you can remove your information by following these steps:</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">Option 1: Delete via Email Request</h2>
            <p>You can request the deletion of your account and all associated data by sending an email to our support team.</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Send an email to: <a href="mailto:dealcloseai.in@gmail.com" className="text-purple-400 font-bold">dealcloseai.in@gmail.com</a></li>
              <li>Subject: <strong>Data Deletion Request</strong></li>
              <li>Please include the email address or phone number associated with your account.</li>
              <li>We will process your request and delete all your data within 7 business days, notifying you once complete.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">Option 2: Remove App via Facebook/Meta</h2>
            <p>You can also remove our app's access directly from your Facebook account settings:</p>
            <ol className="list-decimal pl-5 space-y-2 mt-2">
              <li>Go to your Facebook Account's <strong>Settings & Privacy</strong>. Click <strong>Settings</strong>.</li>
              <li>Look for <strong>Apps and Websites</strong> and you will see all of the apps and websites you linked with your Facebook.</li>
              <li>Search and Click <strong>DealClose AI</strong> in the search bar.</li>
              <li>Scroll and click <strong>Remove</strong>.</li>
              <li>Congratulations, you have successfully removed your app activities and data access.</li>
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}