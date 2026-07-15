# Phase 1 规则来源与证据边界

本文件补充 `PHASE1_IMPLEMENTATION_RULES_V1.md` 的来源定位，不改变任何映射、规则版本或计算结果。

## 古典规则来源

- 十干化运、三阴三阳司天：`《黄帝内经·素问·天元纪大论》`，中国哲学书电子化计划：[原文](https://ctext.org/huangdi-neijing/tian-yuan-ji-da-lun/zh)
- 司天左右间气及三阴三阳循环：`《黄帝内经·素问·六微旨大论》`，中国哲学书电子化计划：[原文](https://ctext.org/huangdi-neijing/liu-wei-zhi-da-lun/zh)
- 太过不及、五音与典型年组合：`《黄帝内经·素问·六元正纪大论》`，中国哲学书电子化计划：[原文](https://ctext.org/huangdi-neijing/liu-yuan-zheng-ji-da-lun)
- 六步节气分段：金代刘完素 `《素问玄机原病式》卷一`，中国哲学书电子化计划：[原文](https://ctext.org/wiki.pl?chapter=125640&if=gb&remap=gb)

## 现代历法交叉核验

- 六十干支顺序：香港天文台[天干地支页面](https://www.hko.gov.hk/sc/gts/time/stemsandbranches.htm)
- 节气定义与 UTC+08:00 年表：香港天文台[二十四节气资料说明](https://www.hko.gov.hk/sc/gts/astronomy/Solar_Term.htm)

香港天文台年表用于分钟级独立核验，不能作为 `tyme4ts` 秒值的背书。代码中的秒级时刻来自锁定版本 `tyme4ts@1.5.2`，其适配器测试必须直接验证。

## 项目工程定义

以下内容是为 Phase 1 结构化输出而制定的项目工程分类，不宣称为古典原文术语：

- `SAME_QI`
- `SAME_ELEMENT_DIFFERENT_QI`
- `HOST_GENERATES_GUEST`
- `GUEST_GENERATES_HOST`
- `HOST_CONTROLS_GUEST`
- `GUEST_CONTROLS_HOST`
- 上述六种关系的判定优先级

这些关系只表达客主气名与五行之间的结构化比较，不构成诊断、辨证或治疗意见。
