import React, { useState } from 'react';
import { X, Plus, Image, Video, Link, Smile, Bold, Italic, List, ListOrdered, Upload, Tag, Calendar, User, Eye, Heart, MessageCircle, Share, Bookmark, Flag } from 'lucide-react';

const PostModalDesigns: React.FC = () => {
  const [selectedDesign, setSelectedDesign] = useState<number | null>(null);

  // 设计1: 极简现代风格 - 与网站配色统一
  const Design1 = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/20">
        <div className="p-6 border-b border-white/20">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">发布新帖子</h2>
            <button className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">帖子标题</label>
            <input 
              type="text" 
              placeholder="输入帖子标题..."
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">选择版块</label>
            <select className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
              <option value="general">行业茶水间</option>
              <option value="business">商务&合作</option>
              <option value="news">黑榜曝光</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">帖子内容</label>
            <textarea 
              placeholder="分享你的想法..."
              rows={6}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
            />
          </div>
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-300">上传图片 (可选)</span>
              <span className="text-xs text-gray-500">0/3</span>
            </div>
            <div className="border-2 border-dashed border-white/20 rounded-lg p-4 text-center hover:border-emerald-500/50 transition-colors cursor-pointer">
              <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400 mb-1">点击或拖拽图片到此处</p>
              <p className="text-xs text-gray-500">支持 JPG、PNG、GIF 格式，单张不超过 5MB</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <Image className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <Video className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <Link className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <Smile className="w-5 h-5" />
              </button>
            </div>
            <div className="flex space-x-3">
              <button className="px-6 py-2 text-gray-300 hover:text-white transition-colors">取消</button>
              <button className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold">
                发布帖子
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 设计2: 卡片式布局
  const Design2 = () => (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">创建新帖子</h2>
            </div>
            <button className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">帖子标题</label>
                <input 
                  type="text" 
                  placeholder="给你的帖子起个标题"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">选择版块</label>
                <select className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option>行业茶水间</option>
                  <option>商务&合作</option>
                  <option>黑榜曝光</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">帖子内容</label>
              <div className="border border-gray-300 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center space-x-2">
                  <button className="p-1 hover:bg-gray-200 rounded"><Bold className="w-4 h-4" /></button>
                  <button className="p-1 hover:bg-gray-200 rounded"><Italic className="w-4 h-4" /></button>
                  <button className="p-1 hover:bg-gray-200 rounded"><List className="w-4 h-4" /></button>
                  <button className="p-1 hover:bg-gray-200 rounded"><ListOrdered className="w-4 h-4" /></button>
                  <button className="p-1 hover:bg-gray-200 rounded"><Image className="w-4 h-4" /></button>
                  <button className="p-1 hover:bg-gray-200 rounded"><Link className="w-4 h-4" /></button>
                </div>
                <textarea 
                  placeholder="分享你的想法和见解..."
                  rows={6}
                  className="w-full px-4 py-3 focus:outline-none resize-none"
                />
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">添加图片 (可选)</span>
                <button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  <Upload className="w-4 h-4" />
                  <span>选择图片</span>
                </button>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p>• 支持 JPG、PNG、GIF 格式</p>
                <p>• 单张图片大小不超过 5MB</p>
                <p>• 最多可上传 3 张图片</p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4">
              <button className="px-6 py-3 text-gray-600 hover:text-gray-800">取消</button>
              <button className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 font-semibold">
                发布帖子
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 设计3: 分步式向导
  const Design3 = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-4xl">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">发布新帖子</h2>
              <p className="text-sm text-gray-400">步骤 1 / 3</p>
            </div>
            <button className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-4">
            <div className="flex space-x-2">
              <div className="w-8 h-2 bg-blue-500 rounded"></div>
              <div className="w-8 h-2 bg-gray-600 rounded"></div>
              <div className="w-8 h-2 bg-gray-600 rounded"></div>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">帖子标题</label>
              <input 
                type="text" 
                placeholder="输入吸引人的标题"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">选择版块</label>
              <select className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>行业茶水间</option>
                <option>商务&合作</option>
                <option>黑榜曝光</option>
              </select>
            </div>
          </div>
          
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">帖子内容</label>
            <textarea 
              placeholder="详细描述你的想法..."
              rows={5}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          
          <div className="mt-6 flex justify-between">
            <button className="px-6 py-2 text-gray-400 hover:text-white">上一步</button>
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">下一步</button>
          </div>
        </div>
      </div>
    </div>
  );

  // 设计4: 社交媒体风格
  const Design4 = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">老k不幽默</h3>
                <p className="text-sm text-gray-500">发布到 行业茶水间</p>
              </div>
            </div>
            <button className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-4">
          <textarea 
            placeholder="你在想什么？"
            rows={4}
            className="w-full text-lg text-gray-800 placeholder-gray-500 focus:outline-none resize-none"
          />
          
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 text-blue-500 hover:text-blue-600">
                <Image className="w-5 h-5" />
                <span className="text-sm">照片</span>
              </button>
              <button className="flex items-center space-x-2 text-green-500 hover:text-green-600">
                <Video className="w-5 h-5" />
                <span className="text-sm">视频</span>
              </button>
              <button className="flex items-center space-x-2 text-purple-500 hover:text-purple-600">
                <Smile className="w-5 h-5" />
                <span className="text-sm">表情</span>
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1 text-sm text-gray-500">
                <Eye className="w-4 h-4" />
                <span>公开</span>
              </div>
              <button className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 font-semibold">
                发布
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 设计5: 专业论坛风格
  const Design5 = () => (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl w-full max-w-3xl border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">发布新帖子</h2>
              <p className="text-sm text-gray-400 mt-1">分享你的专业见解</p>
            </div>
            <button className="text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-3">帖子标题 *</label>
              <input 
                type="text" 
                placeholder="请输入帖子标题"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-3">选择版块 *</label>
              <select className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option>行业茶水间</option>
                <option>商务&合作</option>
                <option>黑榜曝光</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">帖子内容 *</label>
            <div className="border border-gray-600 rounded-lg overflow-hidden">
              <div className="bg-gray-800 px-4 py-3 border-b border-gray-600 flex items-center space-x-3">
                <button className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white">
                  <Bold className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white">
                  <Italic className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white">
                  <List className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white">
                  <ListOrdered className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white">
                  <Image className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white">
                  <Link className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white">
                  <Tag className="w-4 h-4" />
                </button>
              </div>
              <textarea 
                placeholder="请输入帖子内容"
                rows={8}
                className="w-full px-4 py-4 bg-gray-800 text-white focus:outline-none resize-none"
              />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-300">上传图片 (可选)</span>
              <span className="text-xs text-gray-500">0/3</span>
            </div>
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400 mb-2">点击或拖拽图片到此处</p>
              <p className="text-xs text-gray-500">支持 JPG、PNG、GIF 格式，单张不超过 5MB</p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-4">
            <button className="px-6 py-3 text-gray-400 hover:text-white">取消</button>
            <button className="px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold">
              发布帖子
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // 设计6: 移动端优化
  const Design6 = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <button className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-semibold text-gray-800">发布帖子</h2>
          <button className="text-blue-600 font-semibold">发布</button>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <input 
              type="text" 
              placeholder="帖子标题"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <select className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>选择版块</option>
              <option>行业茶水间</option>
              <option>商务&合作</option>
              <option>黑榜曝光</option>
            </select>
          </div>
          
          <div>
            <textarea 
              placeholder="分享你的想法..."
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-500 hover:text-blue-500">
                <Image className="w-6 h-6" />
              </button>
              <button className="p-2 text-gray-500 hover:text-green-500">
                <Video className="w-6 h-6" />
              </button>
              <button className="p-2 text-gray-500 hover:text-purple-500">
                <Smile className="w-6 h-6" />
              </button>
            </div>
            <span className="text-sm text-gray-500">0/500</span>
          </div>
        </div>
      </div>
    </div>
  );

  // 设计7: 游戏化界面
  const Design7 = () => (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl w-full max-w-2xl border-2 border-purple-500 shadow-2xl">
        <div className="p-6 border-b border-purple-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">创建新帖子</h2>
                <p className="text-sm text-purple-300">获得经验值 +50</p>
              </div>
            </div>
            <button className="text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-purple-300 mb-2">帖子标题</label>
              <input 
                type="text" 
                placeholder="输入标题..."
                className="w-full px-4 py-3 bg-gray-700 border border-purple-500/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-purple-300 mb-2">选择版块</label>
              <select className="w-full px-4 py-3 bg-gray-700 border border-purple-500/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option>行业茶水间</option>
                <option>商务&合作</option>
                <option>黑榜曝光</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-purple-300 mb-2">帖子内容</label>
            <textarea 
              placeholder="分享你的想法..."
              rows={5}
              className="w-full px-4 py-3 bg-gray-700 border border-purple-500/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>
          
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-purple-300">添加图片</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-xs text-green-400">在线</span>
              </div>
            </div>
            <div className="flex items-center justify-center py-4 border-2 border-dashed border-purple-500/50 rounded-lg">
              <div className="text-center">
                <Upload className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <p className="text-sm text-purple-300">拖拽图片到此处</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-4">
            <button className="px-6 py-3 text-gray-400 hover:text-white">取消</button>
            <button className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 font-semibold shadow-lg">
              🚀 发布帖子
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // 设计8: 商务专业风格
  const Design8 = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl shadow-2xl">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">发布新帖子</h2>
              <p className="text-sm text-gray-600 mt-1">专业论坛 - 分享你的行业见解</p>
            </div>
            <button className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">帖子标题 *</label>
                <input 
                  type="text" 
                  placeholder="请输入帖子标题"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">帖子内容 *</label>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center space-x-2">
                    <button className="p-1 hover:bg-gray-200 rounded"><Bold className="w-4 h-4" /></button>
                    <button className="p-1 hover:bg-gray-200 rounded"><Italic className="w-4 h-4" /></button>
                    <button className="p-1 hover:bg-gray-200 rounded"><List className="w-4 h-4" /></button>
                    <button className="p-1 hover:bg-gray-200 rounded"><ListOrdered className="w-4 h-4" /></button>
                    <button className="p-1 hover:bg-gray-200 rounded"><Image className="w-4 h-4" /></button>
                    <button className="p-1 hover:bg-gray-200 rounded"><Link className="w-4 h-4" /></button>
                  </div>
                  <textarea 
                    placeholder="请输入帖子内容"
                    rows={8}
                    className="w-full px-4 py-3 focus:outline-none resize-none"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">选择版块 *</label>
                <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>行业茶水间</option>
                  <option>商务&合作</option>
                  <option>黑榜曝光</option>
                </select>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">发布选项</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded" />
                    <span className="ml-2 text-sm text-gray-600">允许评论</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded" />
                    <span className="ml-2 text-sm text-gray-600">置顶显示</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded" />
                    <span className="ml-2 text-sm text-gray-600">发送通知</span>
                  </label>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-800 mb-2">发布指南</h3>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• 标题要简洁明了</li>
                  <li>• 内容要有价值</li>
                  <li>• 遵守社区规范</li>
                  <li>• 避免重复发帖</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end space-x-4">
            <button className="px-6 py-3 text-gray-600 hover:text-gray-800">取消</button>
            <button className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
              发布帖子
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // 设计9: 极简卡片风格
  const Design9 = () => (
    <div className="fixed inset-0 bg-gray-900/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">新帖子</h2>
            <button className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="标题"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
            
            <select className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400">
              <option>选择版块</option>
              <option>行业茶水间</option>
              <option>商务&合作</option>
              <option>黑榜曝光</option>
            </select>
            
            <textarea 
              placeholder="内容"
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
            />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <Image className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <Video className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <Smile className="w-5 h-5" />
                </button>
              </div>
              <button className="px-6 py-2 bg-gray-800 text-white rounded-xl hover:bg-gray-900">
                发布
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 设计10: 创意艺术风格
  const Design10 = () => (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl w-full max-w-3xl shadow-2xl border-4 border-transparent bg-clip-padding" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 m-1">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  创作新帖子
                </h2>
                <p className="text-sm text-gray-600">释放你的创意</p>
              </div>
            </div>
            <button className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">帖子标题</label>
                <input 
                  type="text" 
                  placeholder="给你的创意起个名字"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">选择版块</label>
                <select className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-purple-500 transition-colors">
                  <option>行业茶水间</option>
                  <option>商务&合作</option>
                  <option>黑榜曝光</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">帖子内容</label>
              <div className="border-2 border-gray-200 rounded-2xl overflow-hidden focus-within:border-purple-500 transition-colors">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center space-x-3">
                  <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                    <Bold className="w-4 h-4 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                    <Italic className="w-4 h-4 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                    <List className="w-4 h-4 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                    <Image className="w-4 h-4 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                    <Video className="w-4 h-4 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                    <Smile className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <textarea 
                  placeholder="分享你的创意和想法..."
                  rows={6}
                  className="w-full px-4 py-4 focus:outline-none resize-none"
                />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-purple-700">添加媒体</span>
                <span className="text-xs text-purple-600">0/3 张图片</span>
              </div>
              <div className="border-2 border-dashed border-purple-300 rounded-xl p-6 text-center hover:border-purple-400 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <p className="text-sm text-purple-600 mb-1">点击或拖拽图片到此处</p>
                <p className="text-xs text-purple-500">支持 JPG、PNG、GIF 格式</p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4">
              <button className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors">取消</button>
              <button className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl hover:from-purple-700 hover:to-pink-700 font-semibold shadow-lg transition-all duration-200 hover:shadow-xl">
                ✨ 发布创意
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const designs = [
    { name: "极简现代风格", component: Design1 },
    { name: "卡片式布局", component: Design2 },
    { name: "分步式向导", component: Design3 },
    { name: "社交媒体风格", component: Design4 },
    { name: "专业论坛风格", component: Design5 },
    { name: "移动端优化", component: Design6 },
    { name: "游戏化界面", component: Design7 },
    { name: "商务专业风格", component: Design8 },
    { name: "极简卡片风格", component: Design9 },
    { name: "创意艺术风格", component: Design10 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">发布帖子弹窗设计</h1>
          <p className="text-xl text-gray-300">10种不同的界面设计供您选择</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {designs.map((design, index) => (
            <div key={index} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">{design.name}</h3>
              <button
                onClick={() => setSelectedDesign(index)}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold"
              >
                预览设计 {index + 1}
              </button>
            </div>
          ))}
        </div>
        
        {selectedDesign !== null && (
          <div className="fixed inset-0 z-50">
            {designs[selectedDesign].component()}
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setSelectedDesign(null)}
                className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-colors"
              >
                关闭预览
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostModalDesigns;
