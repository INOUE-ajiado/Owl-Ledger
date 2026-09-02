import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, orderBy, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../api/firebase';
import { useAuth } from '../contexts';
import { Bell, BellRing } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Notification } from '../types';

const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', user.uid), 
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(notifs);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleToggle = async () => {
    const nextIsOpen = !isOpen;
    setIsOpen(nextIsOpen);

    if (nextIsOpen && unreadCount > 0) {
      try {
        const batch = writeBatch(db);
        notifications.forEach(n => {
          if (!n.isRead) {
            const notifRef = doc(db, 'notifications', n.id);
            batch.update(notifRef, { isRead: true });
          }
        });
        await batch.commit();
      } catch (error) {
        console.error("Failed to mark notifications as read:", error);
      }
    }
  };
  
  const handleDeleteNotification = async (id: string) => {
    const notifRef = doc(db, 'notifications', id);
    try {
      await deleteDoc(notifRef);
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={handleToggle} className="relative p-2 text-gray-500 hover:text-gray-700">
        {unreadCount > 0 ? <BellRing className="text-blue-500" /> : <Bell />}
        {unreadCount > 0 && (
          // ★ 修正: 'block' を削除し 'flex' のみにしました
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs text-white bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 bg-white border rounded-md shadow-lg w-80">
          <div className="p-3 font-semibold border-b">通知</div>
          <div className="overflow-y-auto max-h-96">
            {notifications.length === 0 ? (
              <p className="p-4 text-sm text-center text-gray-500">新しい通知はありません</p>
            ) : (
              notifications.map(n => {
                const isOrderConfirmation = n.link.startsWith('/order-confirmation-approval/');
                return (
                  <Link 
                    key={n.id} 
                    to={n.link} 
                    onClick={() => {
                      setIsOpen(false);
                      if (isOrderConfirmation) {
                        handleDeleteNotification(n.id);
                      }
                    }}
                    className="block px-4 py-3 text-sm text-gray-700 border-b hover:bg-gray-100"
                  >
                    <p>{n.message}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {n.createdAt ? new Date(n.createdAt.seconds * 1000).toLocaleString('ja-JP') : ''}
                    </p>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;