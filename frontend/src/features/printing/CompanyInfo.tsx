import type { CompanySettings } from '../../types';

/** 帳票の発行元 (会社名・住所・電話)。会社設定の値を表示する */
export const CompanyAddress = ({ settings, showRegistrationNumber = false, nameClassName = 'font-bold' }: {
  settings: CompanySettings;
  showRegistrationNumber?: boolean;
  nameClassName?: string;
}) => (
  <>
    <p className={nameClassName}>{settings.companyName}</p>
    {showRegistrationNumber && settings.registrationNumber && <p>登録番号: {settings.registrationNumber}</p>}
    {settings.postalCode && <p className="mt-2">〒{settings.postalCode}</p>}
    {settings.address && <p>{settings.address}</p>}
    {settings.tel && <p>TEL: {settings.tel}</p>}
  </>
);

/** 振込先 */
export const BankAccountLines = ({ settings }: { settings: CompanySettings }) => (
  <>
    <p>{[settings.bankName, settings.branchName].filter(Boolean).join(' ')}</p>
    <p>{settings.accountType}預金 {settings.accountNumber}</p>
    {settings.accountHolder && <p>{settings.accountHolder}</p>}
    {settings.accountHolderKana && <p>{settings.accountHolderKana}</p>}
  </>
);
