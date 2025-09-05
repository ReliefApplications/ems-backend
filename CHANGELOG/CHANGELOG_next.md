# [2.15.0-rc.2](https://github.com/ReliefApplications/ems-backend/compare/v2.15.0-rc.1...v2.15.0-rc.2) (2025-09-05)


### Features

* add clone record action in dashboards ([#1208](https://github.com/ReliefApplications/ems-backend/issues/1208)) ([43559db](https://github.com/ReliefApplications/ems-backend/commit/43559db1e671c1ff4fbcad7439120327d99adf13)), closes [AB#118658](https://github.com/AB/issues/118658)

# [2.15.0-rc.1](https://github.com/ReliefApplications/ems-backend/compare/v2.14.0...v2.15.0-rc.1) (2025-08-29)


### Features

* file explorer widget ([ed7b3fa](https://github.com/ReliefApplications/ems-backend/commit/ed7b3fa899199fcd5035265ae63a27eb734e3f12)), closes [Ab#113709](https://github.com/Ab/issues/113709)

# [2.14.0-rc.1](https://github.com/ReliefApplications/ems-backend/compare/v2.13.0...v2.14.0-rc.1) (2025-03-17)


### Features

* enable {{now}} placeholder for datetime fields in edition ([#1200](https://github.com/ReliefApplications/ems-backend/issues/1200)) ([f97295b](https://github.com/ReliefApplications/ems-backend/commit/f97295b5b12d0c8bfb321bd33f5de0d8394cd1a0))

# [2.13.0-rc.3](https://github.com/ReliefApplications/ems-backend/compare/v2.13.0-rc.2...v2.13.0-rc.3) (2025-03-04)


### Features

* Distribution list CRUD ([#1193](https://github.com/ReliefApplications/ems-backend/issues/1193)) ([1b06057](https://github.com/ReliefApplications/ems-backend/commit/1b060575b6574cc46c8b865464057c3cc63a5551))

# [2.13.0-rc.2](https://github.com/ReliefApplications/ems-backend/compare/v2.13.0-rc.1...v2.13.0-rc.2) (2025-02-27)


### Bug Fixes

* nested fields from ref data can now be used as display field in contextual dashboards ([#1197](https://github.com/ReliefApplications/ems-backend/issues/1197)) ([943c108](https://github.com/ReliefApplications/ems-backend/commit/943c1083fcec4fd2147c070e24a6b858f9a4d19d)), closes [AB#110861](https://github.com/AB/issues/110861)

# [2.13.0-rc.1](https://github.com/ReliefApplications/ems-backend/compare/v2.12.2...v2.13.0-rc.1) (2025-02-27)


### Features

* improve back-end caching for common services requests ([173877b](https://github.com/ReliefApplications/ems-backend/commit/173877b6f880194f1da554e4711bbbcb647181bd))

## [2.12.2-rc.1](https://github.com/ReliefApplications/ems-backend/compare/v2.12.1...v2.12.2-rc.1) (2025-02-19)


### Bug Fixes

* allow files to be attached to emails ([#1191](https://github.com/ReliefApplications/ems-backend/issues/1191)) ([49d91cc](https://github.com/ReliefApplications/ems-backend/commit/49d91cc39db11a2c04a0278f5f515bc49c250c3f)), closes [AB#107812](https://github.com/AB/issues/107812)

# [2.12.0-rc.3](https://github.com/ReliefApplications/ems-backend/compare/v2.12.0-rc.2...v2.12.0-rc.3) (2025-02-14)


### Bug Fixes

*  operator would break in many cases due to object id transformation ([98cc979](https://github.com/ReliefApplications/ems-backend/commit/98cc9794f1c6bb9d2bfeee231bf540f8cdede5f3))
* add & remove subscription endpoints not accessible anymore ([9ffcbdd](https://github.com/ReliefApplications/ems-backend/commit/9ffcbdd1f3df27b6573bb7fb00dce6556e334e13))
* add ignore-scripts in npm install for Dockerfile   ([#1180](https://github.com/ReliefApplications/ems-backend/issues/1180)) ([fe089b4](https://github.com/ReliefApplications/ems-backend/commit/fe089b441aa6eae2a6dd9aeb242c4a7023d32a6d)), closes [Ab#108318](https://github.com/Ab/issues/108318)
* application query could get wrong application if shortcut not provided ([7504ed5](https://github.com/ReliefApplications/ems-backend/commit/7504ed51eda7dc1a1b43a8b5fd0c726dcd25f104))
* better group page by url between modules ([4020521](https://github.com/ReliefApplications/ems-backend/commit/4020521bc1fc4c63bfa57f03d36203233c898f20))
* better handle duplication error in editRole mutation ([#1178](https://github.com/ReliefApplications/ems-backend/issues/1178)) ([6b2c975](https://github.com/ReliefApplications/ems-backend/commit/6b2c97579bb45acde332e594e809603e384c32bd)), closes [AB#108245](https://github.com/AB/issues/108245)
* check record expression not working for all fields ([8739c8e](https://github.com/ReliefApplications/ems-backend/commit/8739c8ef59171ab1cc595cbada4916c08ab93c1e))
* createdBy / lastUpdatedBy fields not correctly updated ([d46e62f](https://github.com/ReliefApplications/ems-backend/commit/d46e62fd0f10f92a30b3b21cd95a9eb265fa7999))
* edit dashboard mutation broken when no structure update needed ([fd84dc4](https://github.com/ReliefApplications/ems-backend/commit/fd84dc48732f632c888cac31663626460e0cc654))
* edit records mutation failing when no template selected in grid ([#1125](https://github.com/ReliefApplications/ems-backend/issues/1125)) ([656efa9](https://github.com/ReliefApplications/ems-backend/commit/656efa9f96132db2f5e3a38d0f7dc23dfe6cdac5)), closes [AB#104347](https://github.com/AB/issues/104347)
* empty arrays in dataset & distribution list gql types causing type issues ([d9fc861](https://github.com/ReliefApplications/ems-backend/commit/d9fc861f04f24d432e6edcff5769b45af4d9c00d))
* incorrect update applications email template mutation ([0d534e1](https://github.com/ReliefApplications/ems-backend/commit/0d534e1c9d06fc77da8298df6a7e3650e90739cd))
* issue with load row of upload feature, which would break in some cases due to missing break in switch ([b899d84](https://github.com/ReliefApplications/ems-backend/commit/b899d8494693e766c8b12cabb25e5fa0ed5e23de))
* rate limiter correctly configured ([#1177](https://github.com/ReliefApplications/ems-backend/issues/1177)) ([0d5a290](https://github.com/ReliefApplications/ems-backend/commit/0d5a290003f6d549fb32c44ca8e3fbfab0e1ad26)), closes [AB#108296](https://github.com/AB/issues/108296)
* search index breaking filtering on associated resource & reference data ([#1161](https://github.com/ReliefApplications/ems-backend/issues/1161)) ([f4ce20e](https://github.com/ReliefApplications/ems-backend/commit/f4ce20ef13665e3433b2cfc12bcade8752492b6c))
* update distribution list migration update to reflect latest changes in code ([4317a84](https://github.com/ReliefApplications/ems-backend/commit/4317a84a0a280180b2d74089f46a65bb3385387d))


### Features

* Ability to track user activity navigation logs ([#1167](https://github.com/ReliefApplications/ems-backend/issues/1167)) ([5233f6c](https://github.com/ReliefApplications/ems-backend/commit/5233f6c4a505a7bce919768db69b3c70eeb69c5d)), closes [AB#105244](https://github.com/AB/issues/105244)
* add addRecord action in custom action buttons of dashboards ([#1139](https://github.com/ReliefApplications/ems-backend/issues/1139)) ([62826d2](https://github.com/ReliefApplications/ems-backend/commit/62826d24a824de820806d3641e153f5513f2462c)), closes [AB#104270](https://github.com/AB/issues/104270)
* add class break layer ([#1131](https://github.com/ReliefApplications/ems-backend/issues/1131)) ([cc1c62f](https://github.com/ReliefApplications/ems-backend/commit/cc1c62f1a7ca14267531b97a6c9a131a045b93b4)), closes [AB#104485](https://github.com/AB/issues/104485)
* add class break layer ([#1134](https://github.com/ReliefApplications/ems-backend/issues/1134)) ([dd5725a](https://github.com/ReliefApplications/ems-backend/commit/dd5725a1d98e3fb312b13204031bf35d34bc22e2)), closes [AB#104485](https://github.com/AB/issues/104485)
* Add direct fetch to CS ([#1181](https://github.com/ReliefApplications/ems-backend/issues/1181)) ([d6c8b74](https://github.com/ReliefApplications/ems-backend/commit/d6c8b74d729ec8217df74a5f989364eb52578a83)), closes [AB#108468](https://github.com/AB/issues/108468)
* add EditRecord & goToPreviousPage actions in custom action button of dashboard ([#1136](https://github.com/ReliefApplications/ems-backend/issues/1136)) ([ebb6a3f](https://github.com/ReliefApplications/ems-backend/commit/ebb6a3ff180d5e5b310016daccd732e519881e80)), closes [AB#104621](https://github.com/AB/issues/104621)
* add in / notin operators in records query ([#1127](https://github.com/ReliefApplications/ems-backend/issues/1127)) ([830214e](https://github.com/ReliefApplications/ems-backend/commit/830214e8540dd34dcfa6b1a8d2465353f2d5a6c6)), closes [Ab#104295](https://github.com/Ab/issues/104295)
* Add option to evaluate records expressions when inserted via webjob ([#1151](https://github.com/ReliefApplications/ems-backend/issues/1151)) ([3f14acb](https://github.com/ReliefApplications/ems-backend/commit/3f14acb4504889c55c1defe6cdb4c29443a04c90)), closes [AB#104943](https://github.com/AB/issues/104943)
* add option to use a display field for records elements of queries ([#1152](https://github.com/ReliefApplications/ems-backend/issues/1152)) ([c6bf553](https://github.com/ReliefApplications/ems-backend/commit/c6bf55356fffcb625148f0c6bfa75edf9ffa8282)), closes [Ab#103431](https://github.com/Ab/issues/103431)
* add possibility to auto reload dashboard when using editRecord / addRecord actions ([#1144](https://github.com/ReliefApplications/ems-backend/issues/1144)) ([6c1ef41](https://github.com/ReliefApplications/ems-backend/commit/6c1ef41aa169e5403c316abfab10eb9b808ceb69)), closes [AB#104882](https://github.com/AB/issues/104882)
* add send notification action to custom action buttons ([#1142](https://github.com/ReliefApplications/ems-backend/issues/1142)) ([c742b3f](https://github.com/ReliefApplications/ems-backend/commit/c742b3f0563cc3d151aef75c0e0871735f60561c)), closes [AB#104883](https://github.com/AB/issues/104883)
* add subscribeToNotification action in custom action buttons of dashboard ([#1137](https://github.com/ReliefApplications/ems-backend/issues/1137)) ([a21b5e1](https://github.com/ReliefApplications/ems-backend/commit/a21b5e153029f742cd5ca671dca64995f7230c89)), closes [AB#104719](https://github.com/AB/issues/104719)
* add unsubscribe from notification action in custom action buttons ([#1153](https://github.com/ReliefApplications/ems-backend/issues/1153)) ([906cb62](https://github.com/ReliefApplications/ems-backend/commit/906cb624755819386479077a0aa09cf000e2c7ee)), closes [AB#105519](https://github.com/AB/issues/105519)
* allow mapping between fields custom action button ([#1143](https://github.com/ReliefApplications/ems-backend/issues/1143)) ([06333a1](https://github.com/ReliefApplications/ems-backend/commit/06333a1dbd6df13e0e8be9b4f0d0eaf8adff21cc)), closes [AB#105315](https://github.com/AB/issues/105315)
* can set application shortcut ([#1123](https://github.com/ReliefApplications/ems-backend/issues/1123)) ([287001d](https://github.com/ReliefApplications/ems-backend/commit/287001d7d98d2a62c96e6346e2d77f3342db213f)), closes [AB#104315](https://github.com/AB/issues/104315)
* dashboard export ([#1128](https://github.com/ReliefApplications/ems-backend/issues/1128)) ([f4ea223](https://github.com/ReliefApplications/ems-backend/commit/f4ea223248005cd85f2c603235cb2699e876a3d4)), closes [Ab#104302](https://github.com/Ab/issues/104302)
* Distribution lists can be built using common services users ([#1174](https://github.com/ReliefApplications/ems-backend/issues/1174)) ([e77e240](https://github.com/ReliefApplications/ems-backend/commit/e77e24026853ccad10f3889d57a38bc4dc529433))
* Email functions hosted on serverless function ([#1160](https://github.com/ReliefApplications/ems-backend/issues/1160)) ([a3fb432](https://github.com/ReliefApplications/ems-backend/commit/a3fb432db876eff2f09660b15b0dc7e1ea46f89b))
* form quick action buttons ([#1140](https://github.com/ReliefApplications/ems-backend/issues/1140)) ([7785278](https://github.com/ReliefApplications/ems-backend/commit/77852782b95ee3ab496369ed095ca1bc1bad32be)), closes [AB#104815](https://github.com/AB/issues/104815)
* html question ([#1046](https://github.com/ReliefApplications/ems-backend/issues/1046)) ([712ef3d](https://github.com/ReliefApplications/ems-backend/commit/712ef3d1409654c7652e8d05997b7a87cb4c1c53))
* improvements on email feature ([#1129](https://github.com/ReliefApplications/ems-backend/issues/1129)) ([8beaed7](https://github.com/ReliefApplications/ems-backend/commit/8beaed73f5cb6568dd6d49fc95a29fa52decf137)), closes [Ab#104469](https://github.com/Ab/issues/104469)


### Reverts

* Revert "feat: add class break layer (#1131)" (#1133) ([21122f7](https://github.com/ReliefApplications/ems-backend/commit/21122f7fbc8b2a1320b374835f3ceb401468369a)), closes [#1131](https://github.com/ReliefApplications/ems-backend/issues/1131) [#1133](https://github.com/ReliefApplications/ems-backend/issues/1133)
