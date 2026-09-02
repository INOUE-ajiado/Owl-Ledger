import { useState } from 'react';
import { getAuth, sendSignInLinkToEmail } from 'firebase/auth';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setEmailSent(false);

    const auth = getAuth();
    const actionCodeSettings = {
      url: window.location.origin,
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setEmailSent(true);
    } catch (err: unknown) { // ★ 修正: any -> unknown
      setError('認証リンクの送信に失敗しました。メールアドレスを確認してください。');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-800">++Owl Ledger..</h1>
        {emailSent ? (
          <div className="p-4 text-center text-green-800 bg-green-100 rounded-md">
            <p className="font-semibold">認証メールを送信しました</p>
            <p className="text-sm">受信トレイを確認し、リンクをクリックしてログインを完了してください。</p>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="text-sm font-medium text-gray-700">メールアドレス</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="user@example.com"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
              >
                {loading ? '送信中...' : '認証リンクを送信'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;