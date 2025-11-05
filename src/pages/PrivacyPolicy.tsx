import React from "react";

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-6">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">隐私政策</h1>

          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              更新日期：2025年1月15日
              <br />
              生效日期：2025年1月15日
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                1. 概述
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Intelliclass.online（以下简称"我们"）深知个人信息保护的重要性，特别是学生个人信息的保护。
                我们严格遵守《中华人民共和国网络安全法》、《中华人民共和国个人信息保护法》、
                《中华人民共和国未成年人保护法》等相关法律法规，致力于保护用户的个人信息安全。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                2. 适用范围
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                本政策适用于Intelliclass.online网站及相关服务，包括但不限于：
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>学生成绩分析服务</li>
                <li>学生画像生成服务</li>
                <li>教学管理工具</li>
                <li>AI辅助分析功能</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                3. 学生信息保护特别条款
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                基于《中华人民共和国未成年人保护法》第七十二条及相关规定，我们对学生信息保护承诺：
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>
                  <strong>最小必要原则</strong>
                  ：仅收集教学分析必需的信息，包括学号、姓名、班级、成绩数据
                </li>
                <li>
                  <strong>授权使用</strong>
                  ：学生信息的收集和使用均需获得学校和监护人的明确授权
                </li>
                <li>
                  <strong>用途限制</strong>
                  ：学生信息仅用于教学分析和学生画像生成，不用于商业推广
                </li>
                <li>
                  <strong>数据加密</strong>
                  ：所有学生信息在传输和存储过程中均采用加密技术保护
                </li>
                <li>
                  <strong>访问控制</strong>
                  ：严格限制学生信息的访问权限，仅授权教师可查看相关学生信息
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                4. 信息收集与使用
              </h2>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                4.1 收集的信息类型
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>
                  <strong>学生基本信息</strong>：学号、姓名、班级、年级
                </li>
                <li>
                  <strong>学业信息</strong>：各科目成绩、考试成绩、作业完成情况
                </li>
                <li>
                  <strong>使用信息</strong>：系统访问日志、功能使用记录
                </li>
                <li>
                  <strong>技术信息</strong>
                  ：设备信息、网络信息（仅用于系统安全和性能优化）
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                4.2 信息使用目的
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>提供学生成绩分析和可视化服务</li>
                <li>生成个性化学生画像和学习建议</li>
                <li>协助教师进行教学管理和决策</li>
                <li>改进和优化我们的服务质量</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                5. 信息存储与安全
              </h2>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>
                  <strong>存储地点</strong>
                  ：所有数据存储在中国境内的服务器，符合《网络安全法》数据本地化要求
                </li>
                <li>
                  <strong>安全措施</strong>
                  ：采用业界标准的加密技术、访问控制和安全监控措施
                </li>
                <li>
                  <strong>备份机制</strong>
                  ：建立完善的数据备份和恢复机制，确保数据安全
                </li>
                <li>
                  <strong>人员管理</strong>
                  ：所有接触学生信息的工作人员均签署保密协议
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                6. 信息共享与披露
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                我们承诺不会向第三方出售、出租或以其他方式披露学生个人信息，除非：
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>获得学生监护人的明确同意</li>
                <li>法律法规要求或司法机关要求</li>
                <li>维护我们的合法权益所必需</li>
                <li>保护学生或他人的生命、财产安全所必需</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                7. 用户权利
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                根据《个人信息保护法》，您享有以下权利：
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>
                  <strong>知情权</strong>：了解个人信息的收集、使用情况
                </li>
                <li>
                  <strong>决定权</strong>：对个人信息的处理作出决定
                </li>
                <li>
                  <strong>查询权</strong>：查询个人信息的处理情况
                </li>
                <li>
                  <strong>更正权</strong>：更正不准确的个人信息
                </li>
                <li>
                  <strong>删除权</strong>：要求删除个人信息
                </li>
                <li>
                  <strong>撤回同意权</strong>：撤回对个人信息处理的同意
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                8. Cookie和追踪技术
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                我们使用Cookie和类似技术来改善用户体验，包括：
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>保持用户登录状态</li>
                <li>记住用户偏好设置</li>
                <li>分析网站使用情况</li>
                <li>提供个性化服务</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                您可以通过浏览器设置管理Cookie，但这可能影响某些功能的使用。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                9. 数据保留期限
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                我们将根据以下原则确定个人信息的保留期限：
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>学生在校期间及毕业后3年内保留学业相关信息</li>
                <li>用户注销账户后30天内删除相关个人信息</li>
                <li>法律法规规定的其他保留期限</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                10. 第三方服务
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                我们的服务可能集成第三方技术服务（如AI分析服务），我们会：
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>严格筛选合作伙伴，确保其具备相应的数据保护能力</li>
                <li>通过合同约束第三方的数据使用行为</li>
                <li>定期评估第三方的数据保护措施</li>
                <li>确保数据处理符合相关法律法规</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                11. 未成年人保护
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                我们特别重视未成年人的个人信息保护：
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>未成年人信息的收集需要监护人同意</li>
                <li>采用更严格的安全措施保护未成年人信息</li>
                <li>不得利用未成年人信息进行商业营销</li>
                <li>建立专门的未成年人信息保护机制</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                12. 政策更新
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                我们可能会不时更新本隐私政策。更新时，我们会通过以下方式通知您：
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>在网站显著位置发布更新通知</li>
                <li>通过电子邮件发送更新通知</li>
                <li>在用户登录时显示更新提醒</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                13. 联系我们
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                如果您对本隐私政策有任何疑问、意见或建议，或需要行使您的个人信息权利，请通过以下方式联系我们：
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>
                  <strong>邮箱</strong>：734738695@qq.com
                </li>
                <li>
                  <strong>电话</strong>：13138112934
                </li>
                <li>
                  <strong>网站</strong>：Intelliclass.online
                </li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                我们将在收到您的请求后15个工作日内回复您的查询。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                14. 法律适用
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                本隐私政策的解释、执行和争议解决均适用中华人民共和国法律。
                如发生争议，双方应首先通过友好协商解决；协商不成的，
                任何一方均可向有管辖权的人民法院提起诉讼。
              </p>
            </section>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                特别声明
              </h3>
              <p className="text-blue-800 text-sm leading-relaxed">
                本系统严格遵守《中华人民共和国网络安全法》、《中华人民共和国个人信息保护法》、
                《中华人民共和国未成年人保护法》等相关法律法规，
                致力于为教育行业提供安全、合规的数据分析服务。
                我们承诺持续完善隐私保护措施，确保用户信息安全。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
