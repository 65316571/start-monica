import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Filter } from 'lucide-react';
import PersonForm from '../components/PersonForm';

const People = () => {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPeople();
  }, []);

  const fetchPeople = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching people:', error);
    } else {
      setPeople(data);
    }
    setLoading(false);
  };

  const handlePersonAdded = (newPerson) => {
    setPeople([...people, newPerson]);
    setIsModalOpen(false);
  };

  const filteredPeople = people.filter(person => 
    person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (person.notes && person.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">人物管理</h1>
          <p className="mt-1 text-sm text-gray-500">管理您的人际关系网络。</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          添加人物
        </button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="搜索人物..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* People Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">加载中...</p>
        </div>
      ) : filteredPeople.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">暂无人物数据，请添加您的第一位联系人！</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPeople.map((person) => (
            <div key={person.id} className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 hover:shadow-md transition-shadow">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-100 rounded-full h-12 w-12 flex items-center justify-center text-blue-600 font-bold text-xl">
                    {person.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900 truncate">{person.name}</h3>
                    <p className="text-sm text-gray-500 truncate">{person.gender || '未知'}</p>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-500">
                  {person.contact_info ? (
                    <p className="truncate">{person.contact_info}</p>
                  ) : (
                    <p className="italic text-gray-400">无联系方式</p>
                  )}
                </div>
                {person.notes && (
                  <div className="mt-2 text-sm text-gray-500 line-clamp-2">
                    {person.notes}
                  </div>
                )}
              </div>
              <div className="bg-gray-50 px-4 py-4 sm:px-6 flex justify-end">
                  <button className="text-sm font-medium text-blue-600 hover:text-blue-500">查看详情</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Person Modal */}
      {isModalOpen && (
         <PersonForm onClose={() => setIsModalOpen(false)} onPersonAdded={handlePersonAdded} />
      )}
    </div>
  );
};

export default People;
