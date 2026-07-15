# 中医五运六气与问诊结构化原型系统 PRD V1.0

## 产品定位

面向院内中医医生的五运六气学习、教学和问诊结构化辅助系统。

## 第一阶段目标

### 工作台一：五运六气

实现： - 运气年判断； - 年干支； - 岁运； - 太过不及； - 司天； -
在泉； - 主气； - 客气； - 六步时间轴； - 客主关系。

### 工作台二：问诊结构化

实现： - 主诉； - 发病时间； - 寒热汗饮食二便； - 舌象； - 脉象； -
症状线索； - 六淫线索； - 八纲单项线索。

## 明确禁止

-   自动诊断；
-   自动证型；
-   自动开方；
-   自动用药；
-   疾病预测。

## 技术架构

Frontend: Vite + React + TypeScript

Backend: Node.js + Fastify

Database: PostgreSQL

Architecture: 模块化单体。

核心领域： yunqi-domain

历法： Calendar Provider + tyme4ts适配层。
