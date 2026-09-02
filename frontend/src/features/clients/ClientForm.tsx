import { useForm } from 'react-hook-form';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../api/firebase';
import type { Client } from '../../types';
import { useEffect, useState } from 'react';
import axios from 'axios';

type ClientFormData = Omit<Client, 'id'>;

interface ClientFormProps {
  onClose: () => void;
  editingClient: Client | null;
}

const ClientForm = ({ onClose, editingClient }: ClientFormProps) => {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, watch, setValue } = useForm<ClientFormData>();
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (editingClient) {
      reset(editingClient);
    } else {
      reset();
    }
  }, [editingClient, reset]);

  const handleAddressSearch = async () => {
    const postalCode = watch('postalCode');
    if (!postalCode) {
      alert('郵便番号を入力してください。');
      return;
    }
    
    setIsSearching(true);
    try {
      const formattedPostalCode = postalCode.replace(/-/g, '');
      const response = await axios.get(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${formattedPostalCode}`);
      
      if (response.data.status === 200 && response.data.results) {
        const result = response.data.results[0];
        const address = `${result.address1}${result.address2}${result.address3}`;
        setValue('address', address, { shouldValidate: true });
      } else {
        alert('該当する住所が見つかりませんでした。');
      }
    } catch (error) {
      console.error("Address search error:", error);
      alert('住所の検索に失敗しました。');
    } finally {
      setIsSearching(false);
    }
  };

  const onSubmit = async (data: ClientFormData) => {
    try {
      if (editingClient) {
        const clientDocRef = doc(db, 'clients', editingClient.id);
        await updateDoc(clientDocRef, data);
        alert('クライアント情報を更新しました。');
      } else {
        await addDoc(collection(db, 'clients'), data);
        alert('クライアントを登録しました。');
      }
      onClose();
    } catch (error) {
      console.error("Error saving document: ", error);
      alert('保存に失敗しました。');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          {editingClient ? 'クライアント情報編集' : '新規クライアント登録'}
        </h3>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="clientCode" className="block text-sm font-medium text-gray-700">クライアントID</label>
              <input type="text" id="clientCode" {...register("clientCode", { required: "クライアントIDは必須です" })} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
              {errors.clientCode && <p className="text-red-500 text-xs mt-1">{errors.clientCode.message}</p>}
            </div>
            <div>
              <label htmlFor="nameAbbr" className="block text-sm font-medium text-gray-700">略称</label>
              <input type="text" id="nameAbbr" {...register("nameAbbr")} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
            </div>
            <div className="col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">企業名</label>
              <input type="text" id="name" {...register("name", { required: "企業名は必須です" })} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">郵便番号</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input 
                  type="text" 
                  id="postalCode" 
                  {...register("postalCode")} 
                  className="flex-1 block w-full min-w-0 rounded-none rounded-l-md border-gray-300"
                  placeholder="例: 1000001"
                />
                <button
                  type="button"
                  onClick={handleAddressSearch}
                  disabled={isSearching}
                  className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm hover:bg-gray-100 disabled:bg-gray-200"
                >
                  {isSearching ? '検索中' : '住所検索'}
                </button>
              </div>
            </div>
            <div className="col-span-2">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">住所</label>
              <input type="text" id="address" {...register("address")} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
            </div>
            <div className="col-span-2">
              <label htmlFor="building" className="block text-sm font-medium text-gray-700">建物名</label>
              <input type="text" id="building" {...register("building")} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
            </div>
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700">事業部</label>
              <input type="text" id="department" {...register("department")} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
            </div>
            <div>
              <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700">担当者名</label>
              <input type="text" id="contactPerson" {...register("contactPerson")} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">キャンセル</button>
            <button type="submit" disabled={isSubmitting} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300">
              {isSubmitting ? '保存中...' : '保存する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientForm;