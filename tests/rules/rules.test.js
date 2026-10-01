// Firestore / Storage セキュリティルールのテスト。
// 実行: tests/rules で `npm run test:emulator` (Firestore・Storage エミュレータ上で実行)
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, test } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  addDoc, collection, collectionGroup, deleteDoc, doc, getCountFromServer, getDoc, getDocs,
  query, setDoc, Timestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage';

const ADMIN = 'inoue@ajiado.co.jp';
const STAFF = 'staff@ajiado.co.jp';
const LEDGER_READONLY = 'viewer@ajiado.co.jp';
const OUTSIDER = 'outsider@example.com';
// 「アクセス権限」画面の編集権限はあるが管理者フラグのない社員
const PERM_EDITOR = 'editor@ajiado.co.jp';

const ALL_WRITE = { projects: 'write', clients: 'write', ledger: 'write', dashboard: 'read', permissions: 'read' };

let env;

const staffToken = (email, extra = {}) => ({
  email, email_verified: true, firebase: { sign_in_provider: 'emailLink' }, ...extra,
});

const as = {
  admin: () => env.authenticatedContext('admin-uid', staffToken(ADMIN)).firestore(),
  staff: () => env.authenticatedContext('staff-uid', staffToken(STAFF)).firestore(),
  staffUnverified: () => env.authenticatedContext('staff-uid', staffToken(STAFF, { email_verified: false })).firestore(),
  ledgerReadonly: () => env.authenticatedContext('viewer-uid', staffToken(LEDGER_READONLY)).firestore(),
  outsider: () => env.authenticatedContext('outsider-uid', staffToken(OUTSIDER)).firestore(),
  permEditor: () => env.authenticatedContext('editor-uid', staffToken(PERM_EDITOR)).firestore(),
  anon: () => env.authenticatedContext('anon-uid', { firebase: { sign_in_provider: 'anonymous' } }).firestore(),
  nobody: () => env.unauthenticatedContext().firestore(),
};

const storageAs = {
  staff: () => env.authenticatedContext('staff-uid', staffToken(STAFF)).storage(),
  other: () => env.authenticatedContext('admin-uid', staffToken(ADMIN)).storage(),
  outsider: () => env.authenticatedContext('outsider-uid', staffToken(OUTSIDER)).storage(),
  admin: () => env.authenticatedContext('admin-uid', staffToken(ADMIN)).storage(),
  anon: () => env.authenticatedContext('anon-uid', { firebase: { sign_in_provider: 'anonymous' } }).storage(),
};

const change = (uid, email, overrides = {}) => ({
  timestamp: Timestamp.now(), userId: uid, userEmail: email, targetType: 'project', targetId: 'p1',
  targetLabel: '作品', action: 'update', changes: [{ field: 'gloss', before: '1000', after: '2000' }], ...overrides,
});

const log = (uid, email, overrides = {}) => ({
  action: 'VIEW', targetType: 'project', targetId: 'p1', summary: 'test',
  status: 'info', timestamp: Timestamp.now(), userId: uid, userEmail: email, ...overrides,
});

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-owl-ledger',
    firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') },
    storage: { rules: readFileSync(new URL('../../storage.rules', import.meta.url), 'utf8') },
  });
});

after(async () => { await env?.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'permissions', ADMIN), { permissions: { ...ALL_WRITE, permissions: 'write' }, uid: 'admin-uid', isAdmin: true });
    await setDoc(doc(db, 'permissions', PERM_EDITOR), { permissions: { ...ALL_WRITE, permissions: 'write' } });
    await setDoc(doc(db, 'permissions', STAFF), { permissions: ALL_WRITE });
    await setDoc(doc(db, 'permissions', LEDGER_READONLY), { permissions: { ...ALL_WRITE, ledger: 'read' } });
    await setDoc(doc(db, 'clients', 'c1'), { name: 'クライアント' });
    await setDoc(doc(db, 'projects', 'p1'), { title: '作品', gloss: 1000, clientId: 'c1', orderConfirmationStatus: '承認待ち' });
    await setDoc(doc(db, 'projects', 'p2'), { title: '作品2', gloss: 2000, orderConfirmationStatus: '承認済み' });
    await setDoc(doc(db, 'projects', 'p1', 'purchaseOrders', 'po1'), { workerName: 'A' });
    await setDoc(doc(db, 'ledgerReports', 'r1'), { status: '承認待ち', month: '2026-09', entries: [], submitterUid: 'staff-uid' });
    await setDoc(doc(db, 'ledgerReports', 'r2'), { status: '作成中', month: '2026-09', entries: [] });
    await setDoc(doc(db, 'ledgerReports', 'r3'), { status: '承認済み', month: '2026-08', entries: [{ id: 'e1', expense: 1000 }] });
    await setDoc(doc(db, 'ledgerReports', 'r4'), { status: '経理提出済み', month: '2026-07', entries: [{ id: 'e1', expense: 500 }] });
    await setDoc(doc(db, 'settings', 'company'), { companyName: '会社', taxRate: 10 });
    await setDoc(doc(db, 'staff', 'st1'), { name: '井上 賢治', stampName: '井上', email: ADMIN, active: true });
    await setDoc(doc(db, 'vendors', 'v1'), { name: '外注 太郎', type: 'individual', withholding: true });
    await setDoc(doc(db, 'counters', 'I202610'), { value: 3 });
    await setDoc(doc(db, 'changeHistory', 'h1'), change('admin-uid', ADMIN));
    await setDoc(doc(db, 'ledgerSubjects', 's1'), { name: '交通費' });
    await setDoc(doc(db, 'notifications', 'n1'), { userId: 'staff-uid', message: 'm', link: '/approval/r1', isRead: false });
    await setDoc(doc(db, 'activityLogs', 'l1'), log('staff-uid', STAFF));
    const storage = ctx.storage();
    await uploadBytes(ref(storage, 'receipt-images/admin-uid/a.jpg'), new Uint8Array([1, 2, 3]), { contentType: 'image/jpeg' });
  });
});

describe('社員 (登録済み・メール確認済み) の通常業務', () => {
  test('ログイン時に自分の権限を読み、uid を登録できる', async () => {
    const db = as.staff();
    await assertSucceeds(getDoc(doc(db, 'permissions', STAFF)));
    await assertSucceeds(updateDoc(doc(db, 'permissions', STAFF), { uid: 'staff-uid' }));
  });
  test('自分の権限は変更できない (管理者フラグも)', async () => {
    await assertFails(updateDoc(doc(as.staff(), 'permissions', STAFF), { 'permissions.permissions': 'write' }));
    await assertFails(updateDoc(doc(as.staff(), 'permissions', STAFF), { isAdmin: true }));
    await assertFails(updateDoc(doc(as.staff(), 'permissions', STAFF), { uid: 'staff-uid', isAdmin: true }));
  });
  test('出納帳画面用に権限一覧を読める', async () => {
    await assertSucceeds(getDocs(collection(as.staff(), 'permissions')));
  });
  test('プロジェクト・クライアントの一覧と件数を読める', async () => {
    const db = as.staff();
    await assertSucceeds(getDocs(collection(db, 'projects')));
    await assertSucceeds(getCountFromServer(query(collection(db, 'projects'), where('title', '==', '作品'))));
    await assertSucceeds(getDocs(collection(db, 'clients')));
  });
  test('プロジェクト・クライアントの編集は従来どおり管理者のみ', async () => {
    const db = as.staff();
    await assertFails(updateDoc(doc(db, 'projects', 'p1'), { gloss: 1 }));
    await assertFails(addDoc(collection(db, 'projects'), { title: 'x' }));
    await assertFails(setDoc(doc(db, 'clients', 'c2'), { name: 'x' }));
  });
  test('発注書を読み書きできる', async () => {
    const db = as.staff();
    await assertSucceeds(getDocs(collection(db, 'projects', 'p1', 'purchaseOrders')));
    await assertSucceeds(addDoc(collection(db, 'projects', 'p1', 'purchaseOrders'), { workerName: 'B' }));
    await assertSucceeds(updateDoc(doc(db, 'projects', 'p1', 'purchaseOrders', 'po1'), { passwordHash: 'h' }));
  });
  test('出納帳を作成・編集・提出・承認・削除できる', async () => {
    const db = as.staff();
    await assertSucceeds(getDocs(query(collection(db, 'ledgerReports'), where('month', '==', '2026-09'))));
    await assertSucceeds(addDoc(collection(db, 'ledgerReports'), { status: '作成中', entries: [] }));
    await assertSucceeds(updateDoc(doc(db, 'ledgerReports', 'r2'), { status: '承認待ち', entries: [{ id: 'e1' }] }));
    await assertSucceeds(updateDoc(doc(db, 'ledgerReports', 'r1'), { status: '承認済み', approvedAt: Timestamp.now(), approverName: 'staff' }));
    await assertSucceeds(updateDoc(doc(db, 'ledgerReports', 'r1'), { status: '経理提出済み', accountingSubmittedAt: Timestamp.now() }));
    await assertSucceeds(deleteDoc(doc(db, 'ledgerReports', 'r2')));
  });
  test('科目は読めるが編集は管理者のみ', async () => {
    const db = as.staff();
    await assertSucceeds(getDocs(collection(db, 'ledgerSubjects')));
    await assertFails(addDoc(collection(db, 'ledgerSubjects'), { name: 'x' }));
  });
  test('自分の通知を読み、既読化・削除できる', async () => {
    const db = as.staff();
    await assertSucceeds(getDocs(query(collection(db, 'notifications'), where('userId', '==', 'staff-uid'))));
    const batch = writeBatch(db);
    batch.update(doc(db, 'notifications', 'n1'), { isRead: true });
    await assertSucceeds(batch.commit());
    await assertSucceeds(deleteDoc(doc(db, 'notifications', 'n1')));
  });
  test('通知の宛先・本文は書き換えられない', async () => {
    const db = as.staff();
    await assertFails(updateDoc(doc(db, 'notifications', 'n1'), { userId: 'admin-uid' }));
    await assertFails(updateDoc(doc(db, 'notifications', 'n1'), { message: '偽' }));
  });
  test('自分名義の操作ログを記録できるが、読めない', async () => {
    const db = as.staff();
    await assertSucceeds(addDoc(collection(db, 'activityLogs'), log('staff-uid', STAFF)));
    await assertSucceeds(addDoc(collection(db, 'activityLogs'), log('staff-uid', STAFF, { details: 'err' })));
    await assertFails(getDocs(collection(db, 'activityLogs')));
  });
  test('他人名義・不正な形の操作ログは記録できない', async () => {
    const db = as.staff();
    await assertFails(addDoc(collection(db, 'activityLogs'), log('admin-uid', ADMIN)));
    await assertFails(addDoc(collection(db, 'activityLogs'), log('staff-uid', STAFF, { status: 'hacked' })));
    await assertFails(addDoc(collection(db, 'activityLogs'), log('staff-uid', STAFF, { extra: 1 })));
  });
  test('出納帳が閲覧のみの社員は出納帳を作成できない', async () => {
    const db = as.ledgerReadonly();
    await assertSucceeds(getDocs(collection(db, 'ledgerReports')));
    await assertFails(addDoc(collection(db, 'ledgerReports'), { status: '作成中' }));
  });
});

describe('出納帳の改ざん防止 (電子帳簿保存法)', () => {
  test('承認済み・経理提出済みの出納帳は管理者でも内容を変更・削除できない', async () => {
    for (const db of [as.staff(), as.admin()]) {
      await assertFails(updateDoc(doc(db, 'ledgerReports', 'r3'), { entries: [] }));
      await assertFails(updateDoc(doc(db, 'ledgerReports', 'r3'), { status: '作成中' }));
      await assertFails(updateDoc(doc(db, 'ledgerReports', 'r4'), { status: '承認済み' }));
      await assertFails(deleteDoc(doc(db, 'ledgerReports', 'r3')));
      await assertFails(deleteDoc(doc(db, 'ledgerReports', 'r4')));
    }
  });
  test('経理提出は状態と提出日時だけを変更できる', async () => {
    const db = as.staff();
    await assertFails(updateDoc(doc(db, 'ledgerReports', 'r3'), { status: '経理提出済み', entries: [] }));
    await assertSucceeds(updateDoc(doc(db, 'ledgerReports', 'r3'), { status: '経理提出済み', accountingSubmittedAt: Timestamp.now() }));
  });
  test('作成中から承認済みへは飛ばせず、承認待ちの明細は変更できない', async () => {
    const db = as.staff();
    await assertFails(updateDoc(doc(db, 'ledgerReports', 'r2'), { status: '承認済み' }));
    await assertFails(updateDoc(doc(db, 'ledgerReports', 'r1'), { entries: [{ id: 'x' }] }));
    await assertFails(addDoc(collection(db, 'ledgerReports'), { status: '承認済み', entries: [] }));
  });
  test('添付ファイルは上書き・削除できない', async () => {
    const s = storageAs.staff();
    await assertSucceeds(uploadBytes(ref(s, 'receipt-images/staff-uid/new.jpg'), new Uint8Array([1]), { contentType: 'image/jpeg' }));
    await assertFails(uploadBytes(ref(s, 'receipt-images/staff-uid/new.jpg'), new Uint8Array([2]), { contentType: 'image/jpeg' }));
    await assertFails(deleteObject(ref(s, 'receipt-images/staff-uid/new.jpg')));
    await assertFails(deleteObject(ref(storageAs.admin(), 'receipt-images/admin-uid/a.jpg')));
  });
});

describe('管理者フラグ', () => {
  test('管理者フラグのない社員は権限・会社設定・ログを管理できない', async () => {
    const db = as.permEditor();
    await assertFails(setDoc(doc(db, 'permissions', 'new@ajiado.co.jp'), { permissions: ALL_WRITE }));
    await assertFails(updateDoc(doc(db, 'permissions', STAFF), { isAdmin: true }));
    await assertFails(setDoc(doc(db, 'settings', 'company'), { companyName: 'x' }));
    await assertFails(getDocs(collection(db, 'activityLogs')));
    await assertFails(getDocs(collection(db, 'changeHistory')));
    await assertFails(updateDoc(doc(db, 'projects', 'p1'), { gloss: 1 }));
  });
  test('管理者は他の社員を管理者にできる', async () => {
    await assertSucceeds(updateDoc(doc(as.admin(), 'permissions', STAFF), { isAdmin: true }));
    await assertSucceeds(setDoc(doc(as.staff(), 'settings', 'company'), { companyName: '新' }, { merge: true }));
  });
  test('管理者フラグを外すと管理者でなくなる', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'permissions', ADMIN), { isAdmin: false });
    });
    await assertFails(updateDoc(doc(as.admin(), 'projects', 'p1'), { gloss: 5 }));
  });
});

describe('会社設定・社員・外注先・採番・変更履歴', () => {
  test('会社設定は印刷ページ (匿名) からも読めるが、変更は管理者のみ', async () => {
    await assertSucceeds(getDoc(doc(as.anon(), 'settings', 'company')));
    await assertFails(getDocs(collection(as.anon(), 'settings')));
    await assertFails(setDoc(doc(as.staff(), 'settings', 'company'), { companyName: 'x' }));
    await assertSucceeds(setDoc(doc(as.admin(), 'settings', 'company'), { companyName: 'x', taxRate: 8 }, { merge: true }));
    await assertFails(getDoc(doc(as.nobody(), 'settings', 'company')));
  });
  test('社員マスタは社員が読み、管理者が編集する', async () => {
    await assertSucceeds(getDocs(query(collection(as.staff(), 'staff'), where('email', '==', ADMIN))));
    await assertFails(getDocs(collection(as.anon(), 'staff')));
    await assertFails(addDoc(collection(as.staff(), 'staff'), { name: 'x' }));
    await assertSucceeds(addDoc(collection(as.admin(), 'staff'), { name: 'x', stampName: 'x', active: true }));
  });
  test('外注先マスタはクライアント編集権限のある社員が編集できる', async () => {
    await assertSucceeds(getDocs(collection(as.staff(), 'vendors')));
    await assertSucceeds(addDoc(collection(as.staff(), 'vendors'), { name: 'B', type: 'corporate', withholding: false }));
    await assertFails(getDocs(collection(as.anon(), 'vendors')));
    await assertFails(addDoc(collection(as.outsider(), 'vendors'), { name: 'C' }));
  });
  test('採番は 1 ずつしか進められない', async () => {
    const db = as.staff();
    await assertSucceeds(setDoc(doc(db, 'counters', 'I202610'), { value: 4 }));
    await assertFails(setDoc(doc(db, 'counters', 'I202610'), { value: 10 }));
    await assertFails(setDoc(doc(db, 'counters', 'I202610'), { value: 3 }));
    await assertSucceeds(setDoc(doc(db, 'counters', 'Q202610'), { value: 1 }));
    await assertFails(setDoc(doc(db, 'counters', 'P202610'), { value: 2 }));
    await assertFails(setDoc(doc(as.anon(), 'counters', 'C202610'), { value: 1 }));
  });
  test('変更履歴は本人名義で追記だけでき、読めるのは管理者のみ', async () => {
    await assertSucceeds(addDoc(collection(as.staff(), 'changeHistory'), change('staff-uid', STAFF)));
    await assertSucceeds(addDoc(collection(as.anon(), 'changeHistory'), change('anon-uid', 'anonymous_visitor', { targetType: 'ledger' })));
    await assertFails(addDoc(collection(as.staff(), 'changeHistory'), change('admin-uid', ADMIN)));
    await assertFails(addDoc(collection(as.staff(), 'changeHistory'), change('staff-uid', STAFF, { action: 'hack' })));
    await assertFails(addDoc(collection(as.staff(), 'changeHistory'), change('staff-uid', STAFF, { extra: 1 })));
    await assertFails(getDocs(collection(as.staff(), 'changeHistory')));
    await assertSucceeds(getDocs(query(collection(as.admin(), 'changeHistory'), where('targetId', '==', 'p1'))));
    await assertFails(updateDoc(doc(as.admin(), 'changeHistory', 'h1'), { targetLabel: 'x' }));
    await assertFails(deleteDoc(doc(as.admin(), 'changeHistory', 'h1')));
  });
  test('全プロジェクトの発注書をまとめて読めるのは社員のみ', async () => {
    await assertSucceeds(getDocs(collectionGroup(as.staff(), 'purchaseOrders')));
    await assertFails(getDocs(collectionGroup(as.anon(), 'purchaseOrders')));
    await assertFails(getDocs(collectionGroup(as.outsider(), 'purchaseOrders')));
  });
  test('ロゴ・角印は管理者だけが画像をアップロードできる', async () => {
    const png = new Uint8Array([137, 80, 78, 71]);
    await assertSucceeds(uploadBytes(ref(storageAs.admin(), 'company-assets/logo.png'), png, { contentType: 'image/png' }));
    await assertFails(uploadBytes(ref(storageAs.staff(), 'company-assets/logo2.png'), png, { contentType: 'image/png' }));
    await assertFails(uploadBytes(ref(storageAs.admin(), 'company-assets/x.svg'), png, { contentType: 'image/svg+xml' }));
  });
});

describe('管理者', () => {
  test('プロジェクト・クライアント・科目・権限を管理できる', async () => {
    const db = as.admin();
    await assertSucceeds(addDoc(collection(db, 'projects'), { title: 'x' }));
    await assertSucceeds(updateDoc(doc(db, 'projects', 'p1'), { gloss: 5, previewPasswordHash: 'h' }));
    await assertSucceeds(deleteDoc(doc(db, 'projects', 'p2')));
    await assertSucceeds(setDoc(doc(db, 'clients', 'c2'), { name: 'x' }));
    await assertSucceeds(addDoc(collection(db, 'ledgerSubjects'), { name: 'x' }));
    await assertSucceeds(setDoc(doc(db, 'permissions', 'new@ajiado.co.jp'), { permissions: ALL_WRITE }));
    await assertSucceeds(setDoc(doc(db, 'permissions', STAFF), { permissions: { ledger: 'read' } }, { merge: true }));
    await assertSucceeds(deleteDoc(doc(db, 'permissions', LEDGER_READONLY)));
    await assertSucceeds(getDocs(collection(db, 'activityLogs')));
  });
});

describe('承認・印刷用URLを開く社外の人 (匿名ログイン)', () => {
  test('URL で指定されたプロジェクト・クライアント・発注書は読める', async () => {
    const db = as.anon();
    await assertSucceeds(getDoc(doc(db, 'projects', 'p1')));
    await assertSucceeds(getDoc(doc(db, 'clients', 'c1')));
    await assertSucceeds(getDocs(collection(db, 'projects', 'p1', 'purchaseOrders')));
    await assertSucceeds(getDoc(doc(db, 'projects', 'p1', 'purchaseOrders', 'po1')));
  });
  test('一覧は取得できない', async () => {
    const db = as.anon();
    await assertFails(getDocs(collection(db, 'projects')));
    await assertFails(getDocs(collection(db, 'clients')));
    await assertFails(getDocs(collection(db, 'ledgerReports')));
    await assertFails(getDocs(collection(db, 'permissions')));
    await assertFails(getDocs(collection(db, 'ledgerSubjects')));
  });
  test('受注伝票を承認できる', async () => {
    await assertSucceeds(updateDoc(doc(as.anon(), 'projects', 'p1'), {
      orderConfirmationStatus: '承認済み', orderConfirmationApprovedAt: Timestamp.now(), orderConfirmationApproverName: '小澤',
    }));
  });
  test('承認に紛れて金額などを書き換えることはできない', async () => {
    await assertFails(updateDoc(doc(as.anon(), 'projects', 'p1'), { orderConfirmationStatus: '承認済み', gloss: 1 }));
    await assertFails(updateDoc(doc(as.anon(), 'projects', 'p1'), { gloss: 1 }));
    await assertFails(updateDoc(doc(as.anon(), 'projects', 'p2'), { orderConfirmationStatus: '承認済み' }));
  });
  test('出納帳を1件読み、承認できる', async () => {
    const db = as.anon();
    await assertSucceeds(getDoc(doc(db, 'ledgerReports', 'r1')));
    await assertSucceeds(updateDoc(doc(db, 'ledgerReports', 'r1'), { status: '承認済み', approvedAt: Timestamp.now(), approverName: '小澤' }));
  });
  test('出納帳の中身の改ざん・削除・作成はできない', async () => {
    const db = as.anon();
    await assertFails(updateDoc(doc(db, 'ledgerReports', 'r1'), { status: '承認済み', entries: [{ receiptImageUrl: 'https://evil.example' }] }));
    await assertFails(updateDoc(doc(db, 'ledgerReports', 'r2'), { status: '承認済み' }));
    await assertFails(deleteDoc(doc(db, 'ledgerReports', 'r1')));
    await assertFails(addDoc(collection(db, 'ledgerReports'), { status: '作成中' }));
  });
  test('発注書・権限は書き換えられない', async () => {
    const db = as.anon();
    await assertFails(updateDoc(doc(db, 'projects', 'p1', 'purchaseOrders', 'po1'), { workerName: 'x' }));
    await assertFails(getDoc(doc(db, 'permissions', ADMIN)));
  });
  test('閲覧ログは匿名名義でのみ記録できる', async () => {
    const db = as.anon();
    await assertSucceeds(addDoc(collection(db, 'activityLogs'), log('anon-uid', 'anonymous_visitor')));
    await assertFails(addDoc(collection(db, 'activityLogs'), log('anon-uid', ADMIN)));
  });
});

describe('権限未登録のユーザー (メールリンクで勝手に作ったアカウント)', () => {
  test('自分の権限ドキュメントの有無だけ確認できる', async () => {
    await assertSucceeds(getDoc(doc(as.outsider(), 'permissions', OUTSIDER)));
    await assertFails(getDoc(doc(as.outsider(), 'permissions', ADMIN)));
  });
  test('一覧取得・編集はできない', async () => {
    const db = as.outsider();
    await assertFails(getDocs(collection(db, 'projects')));
    await assertFails(getDocs(collection(db, 'permissions')));
    await assertFails(getDocs(collection(db, 'ledgerReports')));
    await assertFails(addDoc(collection(db, 'ledgerReports'), { status: '作成中' }));
    await assertFails(addDoc(collection(db, 'projects', 'p1', 'purchaseOrders'), { workerName: 'x' }));
  });
  test('メール未確認なら登録済みメールでも社員扱いしない', async () => {
    await assertFails(getDocs(collection(as.staffUnverified(), 'projects')));
  });
});

describe('未ログイン', () => {
  test('何も読めない (権限一覧も非公開)', async () => {
    const db = as.nobody();
    await assertFails(getDocs(collection(db, 'permissions')));
    await assertFails(getDoc(doc(db, 'permissions', ADMIN)));
    await assertFails(getDoc(doc(db, 'projects', 'p1')));
    await assertFails(getDoc(doc(db, 'ledgerReports', 'r1')));
  });
});

describe('Storage (領収書)', () => {
  const bytes = new Uint8Array([1, 2, 3]);
  test('社員は自分のフォルダに画像・PDF・その他の書類をアップロードできる', async () => {
    const s = storageAs.staff();
    await assertSucceeds(uploadBytes(ref(s, 'receipt-images/staff-uid/1_a.jpg'), bytes, { contentType: 'image/jpeg' }));
    await assertSucceeds(uploadBytes(ref(s, 'receipt-images/staff-uid/2_a.pdf'), bytes, { contentType: 'application/pdf' }));
    await assertSucceeds(uploadBytes(ref(s, 'receipt-images/staff-uid/3_a.xlsx'), bytes, { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  });
  test('HTML/SVG など危険な形式や、他人のフォルダへはアップロードできない', async () => {
    const s = storageAs.staff();
    await assertFails(uploadBytes(ref(s, 'receipt-images/staff-uid/x.html'), bytes, { contentType: 'text/html' }));
    await assertFails(uploadBytes(ref(s, 'receipt-images/staff-uid/x.svg'), bytes, { contentType: 'image/svg+xml' }));
    await assertFails(uploadBytes(ref(s, 'receipt-images/staff-uid/x.xml'), bytes, { contentType: 'application/xml' }));
    await assertFails(uploadBytes(ref(s, 'receipt-images/staff-uid/x.js'), bytes, { contentType: 'text/javascript; charset=utf-8' }));
    await assertFails(uploadBytes(ref(s, 'receipt-images/admin-uid/x.jpg'), bytes, { contentType: 'image/jpeg' }));
    await assertFails(uploadBytes(ref(s, 'other/x.jpg'), bytes, { contentType: 'image/jpeg' }));
  });
  test('社員は他の社員の添付を読める (削除は保存義務のため不可)', async () => {
    const s = storageAs.staff();
    await assertSucceeds(getBytes(ref(s, 'receipt-images/admin-uid/a.jpg')));
    await assertFails(deleteObject(ref(s, 'receipt-images/admin-uid/a.jpg')));
  });
  test('匿名・未登録ユーザーは読み書きできない', async () => {
    for (const s of [storageAs.anon(), storageAs.outsider()]) {
      await assertFails(getBytes(ref(s, 'receipt-images/admin-uid/a.jpg')));
      await assertFails(uploadBytes(ref(s, 'receipt-images/anon-uid/x.jpg'), bytes, { contentType: 'image/jpeg' }));
      await assertFails(deleteObject(ref(s, 'receipt-images/admin-uid/a.jpg')));
    }
  });
});
