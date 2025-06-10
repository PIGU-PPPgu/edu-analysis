import React from "react";

const ICPNotice: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-6">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-red-600 mb-4">ICP备案说明</h1>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">
                致网站审核人员的重要说明
              </p>
            </div>
          </div>
          
          <div className="space-y-8">
            <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-blue-900 mb-4">🔍 网站性质说明</h2>
              <div className="space-y-4 text-blue-800">
                <p className="text-lg font-medium">
                  本网站为<strong class="text-red-600">非商业性个人工作工具</strong>，仅供本人工作使用。
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>使用性质</strong>：个人工作辅助工具</li>
                  <li><strong>访问范围</strong>：仅限开发者个人使用</li>
                  <li><strong>商业目的</strong>：无任何商业行为</li>
                  <li><strong>数据性质</strong>：测试数据，非真实学生信息</li>
                </ul>
              </div>
            </section>

            <section className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-green-900 mb-4">📋 备案理由详述</h2>
              <div className="space-y-4 text-green-800">
                <h3 className="text-lg font-semibold">开发目的：</h3>
                <p className="leading-relaxed">
                  本网站开发的主要目的是<strong>方便个人工作</strong>，作为教育数据分析的研究和开发工具。
                  由于涉及学生数据处理功能的开发和测试，为确保数据安全和合规性，
                  <strong class="text-red-600">暂不对外开放，仅限个人使用</strong>。
                </p>
                
                <h3 className="text-lg font-semibold mt-6">使用限制：</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>不对公众开放注册或访问</li>
                  <li>不进行任何商业运营活动</li>
                  <li>不收集真实用户的个人信息</li>
                  <li>不提供对外服务或产品销售</li>
                  <li>仅用于技术开发和功能测试</li>
                </ul>
              </div>
            </section>

            <section className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-yellow-900 mb-4">⚠️ 学生数据安全承诺</h2>
              <div className="space-y-4 text-yellow-800">
                <p className="leading-relaxed">
                  鉴于网站功能涉及教育数据分析，我们特别重视学生信息安全：
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>测试数据</strong>：网站仅使用虚拟测试数据，不涉及真实学生信息</li>
                  <li><strong>访问控制</strong>：严格限制访问权限，仅开发者本人可以使用</li>
                  <li><strong>数据保护</strong>：严格遵守《个人信息保护法》等相关法规</li>
                  <li><strong>安全措施</strong>：采用加密存储和传输，确保数据安全</li>
                  <li><strong>合规承诺</strong>：如需对外开放，将重新申请相应许可</li>
                </ul>
              </div>
            </section>

            <section className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">📞 联系方式</h2>
              <div className="space-y-3 text-gray-700">
                <p><strong>网站负责人</strong>：网站开发者</p>
                <p><strong>联系邮箱</strong>：<a href="mailto:734738695@qq.com" className="text-blue-600 hover:underline">734738695@qq.com</a></p>
                <p><strong>联系电话</strong>：<a href="tel:13138112934" className="text-blue-600 hover:underline">13138112934</a></p>
                <p><strong>备案类型</strong>：个人网站备案（非经营性）</p>
              </div>
            </section>

            <section className="bg-red-50 border border-red-300 rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-red-900 mb-4">🔒 重要声明</h2>
              <div className="space-y-4 text-red-800">
                <p className="text-lg font-bold text-center">
                  本网站严格按照个人非商业性网站进行备案和运营
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>承诺不进行任何商业活动</li>
                  <li>承诺不对外提供服务</li>
                  <li>承诺保护数据安全和用户隐私</li>
                  <li>承诺遵守国家相关法律法规</li>
                  <li>如需变更网站性质，将及时重新申请备案</li>
                </ul>
                
                <div className="bg-red-100 border border-red-300 rounded p-4 mt-4">
                  <p className="text-center font-bold text-red-900">
                    请审核人员知悉：本网站仅为个人工作工具，<br/>
                    暂不对外开放，感谢理解与支持！
                  </p>
                </div>
              </div>
            </section>

            <div className="text-center mt-8 p-6 bg-gray-100 rounded-lg">
              <p className="text-gray-600">
                <strong>ICP备案号</strong>：粤ICP备2025392229号<br/>
                <strong>备案时间</strong>：2025年1月<br/>
                <strong>网站域名</strong>：Intelliclass.online
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ICPNotice; 