# [2.12.0-beta.13](https://github.com/ReliefApplications/ems-backend/compare/v2.12.0-beta.12...v2.12.0-beta.13) (2025-02-06)


### Bug Fixes

* add & remove subscription endpoints not accessible anymore ([9ffcbdd](https://github.com/ReliefApplications/ems-backend/commit/9ffcbdd1f3df27b6573bb7fb00dce6556e334e13))
* add ignore-scripts in npm install for Dockerfile   ([#1180](https://github.com/ReliefApplications/ems-backend/issues/1180)) ([fe089b4](https://github.com/ReliefApplications/ems-backend/commit/fe089b441aa6eae2a6dd9aeb242c4a7023d32a6d)), closes [Ab#108318](https://github.com/Ab/issues/108318)
* better group page by url between modules ([4020521](https://github.com/ReliefApplications/ems-backend/commit/4020521bc1fc4c63bfa57f03d36203233c898f20))
* better handle duplication error in editRole mutation ([#1178](https://github.com/ReliefApplications/ems-backend/issues/1178)) ([6b2c975](https://github.com/ReliefApplications/ems-backend/commit/6b2c97579bb45acde332e594e809603e384c32bd)), closes [AB#108245](https://github.com/AB/issues/108245)
* rate limiter correctly configured ([#1177](https://github.com/ReliefApplications/ems-backend/issues/1177)) ([0d5a290](https://github.com/ReliefApplications/ems-backend/commit/0d5a290003f6d549fb32c44ca8e3fbfab0e1ad26)), closes [AB#108296](https://github.com/AB/issues/108296)
* search index breaking filtering on associated resource & reference data ([#1161](https://github.com/ReliefApplications/ems-backend/issues/1161)) ([f4ce20e](https://github.com/ReliefApplications/ems-backend/commit/f4ce20ef13665e3433b2cfc12bcade8752492b6c))


### Features

* Ability to track user activity navigation logs ([#1167](https://github.com/ReliefApplications/ems-backend/issues/1167)) ([5233f6c](https://github.com/ReliefApplications/ems-backend/commit/5233f6c4a505a7bce919768db69b3c70eeb69c5d)), closes [AB#105244](https://github.com/AB/issues/105244)
* add addRecord action in custom action buttons of dashboards ([#1139](https://github.com/ReliefApplications/ems-backend/issues/1139)) ([62826d2](https://github.com/ReliefApplications/ems-backend/commit/62826d24a824de820806d3641e153f5513f2462c)), closes [AB#104270](https://github.com/AB/issues/104270)
* Add direct fetch to CS ([#1181](https://github.com/ReliefApplications/ems-backend/issues/1181)) ([d6c8b74](https://github.com/ReliefApplications/ems-backend/commit/d6c8b74d729ec8217df74a5f989364eb52578a83)), closes [AB#108468](https://github.com/AB/issues/108468)
* add EditRecord & goToPreviousPage actions in custom action button of dashboard ([#1136](https://github.com/ReliefApplications/ems-backend/issues/1136)) ([ebb6a3f](https://github.com/ReliefApplications/ems-backend/commit/ebb6a3ff180d5e5b310016daccd732e519881e80)), closes [AB#104621](https://github.com/AB/issues/104621)
* add possibility to auto reload dashboard when using editRecord / addRecord actions ([#1144](https://github.com/ReliefApplications/ems-backend/issues/1144)) ([6c1ef41](https://github.com/ReliefApplications/ems-backend/commit/6c1ef41aa169e5403c316abfab10eb9b808ceb69)), closes [AB#104882](https://github.com/AB/issues/104882)
* add send notification action to custom action buttons ([#1142](https://github.com/ReliefApplications/ems-backend/issues/1142)) ([c742b3f](https://github.com/ReliefApplications/ems-backend/commit/c742b3f0563cc3d151aef75c0e0871735f60561c)), closes [AB#104883](https://github.com/AB/issues/104883)
* add subscribeToNotification action in custom action buttons of dashboard ([#1137](https://github.com/ReliefApplications/ems-backend/issues/1137)) ([a21b5e1](https://github.com/ReliefApplications/ems-backend/commit/a21b5e153029f742cd5ca671dca64995f7230c89)), closes [AB#104719](https://github.com/AB/issues/104719)
* add unsubscribe from notification action in custom action buttons ([#1153](https://github.com/ReliefApplications/ems-backend/issues/1153)) ([906cb62](https://github.com/ReliefApplications/ems-backend/commit/906cb624755819386479077a0aa09cf000e2c7ee)), closes [AB#105519](https://github.com/AB/issues/105519)
* allow mapping between fields custom action button ([#1143](https://github.com/ReliefApplications/ems-backend/issues/1143)) ([06333a1](https://github.com/ReliefApplications/ems-backend/commit/06333a1dbd6df13e0e8be9b4f0d0eaf8adff21cc)), closes [AB#105315](https://github.com/AB/issues/105315)
* Distribution lists can be built using common services users ([#1174](https://github.com/ReliefApplications/ems-backend/issues/1174)) ([e77e240](https://github.com/ReliefApplications/ems-backend/commit/e77e24026853ccad10f3889d57a38bc4dc529433))
* Email functions hosted on serverless function ([#1160](https://github.com/ReliefApplications/ems-backend/issues/1160)) ([a3fb432](https://github.com/ReliefApplications/ems-backend/commit/a3fb432db876eff2f09660b15b0dc7e1ea46f89b))
* form quick action buttons ([#1140](https://github.com/ReliefApplications/ems-backend/issues/1140)) ([7785278](https://github.com/ReliefApplications/ems-backend/commit/77852782b95ee3ab496369ed095ca1bc1bad32be)), closes [AB#104815](https://github.com/AB/issues/104815)
* improvements on email feature ([#1129](https://github.com/ReliefApplications/ems-backend/issues/1129)) ([8beaed7](https://github.com/ReliefApplications/ems-backend/commit/8beaed73f5cb6568dd6d49fc95a29fa52decf137)), closes [Ab#104469](https://github.com/Ab/issues/104469)

# [2.12.0-beta.12](https://github.com/ReliefApplications/ems-backend/compare/v2.12.0-beta.11...v2.12.0-beta.12) (2024-11-21)


### Bug Fixes

* issue with load row of upload feature, which would break in some cases due to missing break in switch ([b899d84](https://github.com/ReliefApplications/ems-backend/commit/b899d8494693e766c8b12cabb25e5fa0ed5e23de))

# [2.12.0-beta.11](https://github.com/ReliefApplications/ems-backend/compare/v2.12.0-beta.10...v2.12.0-beta.11) (2024-11-18)


### Bug Fixes

* createdBy / lastUpdatedBy fields not correctly updated ([d46e62f](https://github.com/ReliefApplications/ems-backend/commit/d46e62fd0f10f92a30b3b21cd95a9eb265fa7999))

# [2.12.0-beta.10](https://github.com/ReliefApplications/ems-backend/compare/v2.12.0-beta.9...v2.12.0-beta.10) (2024-11-18)


### Features

* add option to use a display field for records elements of queries ([#1152](https://github.com/ReliefApplications/ems-backend/issues/1152)) ([c6bf553](https://github.com/ReliefApplications/ems-backend/commit/c6bf55356fffcb625148f0c6bfa75edf9ffa8282)), closes [Ab#103431](https://github.com/Ab/issues/103431)

# [2.12.0-beta.9](https://github.com/ReliefApplications/ems-backend/compare/v2.12.0-beta.8...v2.12.0-beta.9) (2024-11-13)


### Bug Fixes

* check record expression not working for all fields ([8739c8e](https://github.com/ReliefApplications/ems-backend/commit/8739c8ef59171ab1cc595cbada4916c08ab93c1e))

# [2.12.0-beta.8](https://github.com/ReliefApplications/ems-backend/compare/v2.12.0-beta.7...v2.12.0-beta.8) (2024-11-08)


### Features

* Add option to evaluate records expressions when inserted via webjob ([#1151](https://github.com/ReliefApplications/ems-backend/issues/1151)) ([3f14acb](https://github.com/ReliefApplications/ems-backend/commit/3f14acb4504889c55c1defe6cdb4c29443a04c90)), closes [AB#104943](https://github.com/AB/issues/104943)

# [2.12.0-beta.7](https://github.com/ReliefApplications/ems-backend/compare/v2.12.0-beta.6...v2.12.0-beta.7) (2024-10-22)


### Bug Fixes

* edit dashboard mutation broken when no structure update needed ([fd84dc4](https://github.com/ReliefApplications/ems-backend/commit/fd84dc48732f632c888cac31663626460e0cc654))


### Features

* add class break layer ([#1131](https://github.com/ReliefApplications/ems-backend/issues/1131)) ([cc1c62f](https://github.com/ReliefApplications/ems-backend/commit/cc1c62f1a7ca14267531b97a6c9a131a045b93b4)), closes [AB#104485](https://github.com/AB/issues/104485)
* add class break layer ([#1134](https://github.com/ReliefApplications/ems-backend/issues/1134)) ([dd5725a](https://github.com/ReliefApplications/ems-backend/commit/dd5725a1d98e3fb312b13204031bf35d34bc22e2)), closes [AB#104485](https://github.com/AB/issues/104485)


### Reverts

* Revert "feat: add class break layer (#1131)" (#1133) ([21122f7](https://github.com/ReliefApplications/ems-backend/commit/21122f7fbc8b2a1320b374835f3ceb401468369a)), closes [#1131](https://github.com/ReliefApplications/ems-backend/issues/1131) [#1133](https://github.com/ReliefApplications/ems-backend/issues/1133)

# [2.12.0-beta.6](https://github.com/ReliefApplications/ems-backend/compare/v2.12.0-beta.5...v2.12.0-beta.6) (2024-10-18)


### Bug Fixes

*  operator would break in many cases due to object id transformation ([98cc979](https://github.com/ReliefApplications/ems-backend/commit/98cc9794f1c6bb9d2bfeee231bf540f8cdede5f3))
* application query could get wrong application if shortcut not provided ([7504ed5](https://github.com/ReliefApplications/ems-backend/commit/7504ed51eda7dc1a1b43a8b5fd0c726dcd25f104))


### Features

* dashboard export ([#1128](https://github.com/ReliefApplications/ems-backend/issues/1128)) ([f4ea223](https://github.com/ReliefApplications/ems-backend/commit/f4ea223248005cd85f2c603235cb2699e876a3d4)), closes [Ab#104302](https://github.com/Ab/issues/104302)

# [2.12.0-beta.5](https://github.com/ReliefApplications/ems-backend/compare/v2.12.0-beta.4...v2.12.0-beta.5) (2024-10-16)


### Features

* can set application shortcut ([#1123](https://github.com/ReliefApplications/ems-backend/issues/1123)) ([287001d](https://github.com/ReliefApplications/ems-backend/commit/287001d7d98d2a62c96e6346e2d77f3342db213f)), closes [AB#104315](https://github.com/AB/issues/104315)

# [2.12.0-beta.4](https://github.com/ReliefApplications/ems-backend/compare/v2.12.0-beta.3...v2.12.0-beta.4) (2024-10-15)


### Features

* add in / notin operators in records query ([#1127](https://github.com/ReliefApplications/ems-backend/issues/1127)) ([830214e](https://github.com/ReliefApplications/ems-backend/commit/830214e8540dd34dcfa6b1a8d2465353f2d5a6c6)), closes [Ab#104295](https://github.com/Ab/issues/104295)

# [2.12.0-beta.3](https://github.com/ReliefApplications/ems-backend/compare/v2.12.0-beta.2...v2.12.0-beta.3) (2024-10-11)


### Bug Fixes

* edit records mutation failing when no template selected in grid ([#1125](https://github.com/ReliefApplications/ems-backend/issues/1125)) ([656efa9](https://github.com/ReliefApplications/ems-backend/commit/656efa9f96132db2f5e3a38d0f7dc23dfe6cdac5)), closes [AB#104347](https://github.com/AB/issues/104347)

# [2.12.0-beta.2](https://github.com/ReliefApplications/ems-backend/compare/v2.12.0-beta.1...v2.12.0-beta.2) (2024-10-03)


### Bug Fixes

* record validation preventing some valid records to be updated ([#1117](https://github.com/ReliefApplications/ems-backend/issues/1117)) ([0a9b117](https://github.com/ReliefApplications/ems-backend/commit/0a9b117641f3835c0b70ec5b665777e50d47e9eb)), closes [AB#103766](https://github.com/AB/issues/103766)


### Features

* add possibility to show or hide page / step name ([#1116](https://github.com/ReliefApplications/ems-backend/issues/1116)) ([b044b24](https://github.com/ReliefApplications/ems-backend/commit/b044b244c4c657aa765066bddc9fec6ef58dd9bd)), closes [AB#102826](https://github.com/AB/issues/102826)

# [2.12.0-beta.1](https://github.com/ReliefApplications/ems-backend/compare/v2.11.0...v2.12.0-beta.1) (2024-07-04)


### Bug Fixes

* add better handling for file upload AB[#64764](https://github.com/ReliefApplications/ems-backend/issues/64764) ([85279df](https://github.com/ReliefApplications/ems-backend/commit/85279df8faee69f3645ddc1cebd6cd01fa999c02))
* types path breaking the build ([8bde904](https://github.com/ReliefApplications/ems-backend/commit/8bde9048a1e8e0b35b70c9be786a3ea0b762a6bd))


### Features

* add canDownloadRecords permission ([#1095](https://github.com/ReliefApplications/ems-backend/issues/1095)) ([abc3e05](https://github.com/ReliefApplications/ems-backend/commit/abc3e05fea50edee6e3ed4b7cc00bc83f6f9de71))
* html question ([#1046](https://github.com/ReliefApplications/ems-backend/issues/1046)) ([712ef3d](https://github.com/ReliefApplications/ems-backend/commit/712ef3d1409654c7652e8d05997b7a87cb4c1c53))


### Reverts

* Revert "Revert "revert changes AB#91806 (#1055)" (#1056)" (#1057) ([b6c7ec7](https://github.com/ReliefApplications/ems-backend/commit/b6c7ec7b62e50fc529abf2965214fac90a048598)), closes [AB#91806](https://github.com/AB/issues/91806) [#1055](https://github.com/ReliefApplications/ems-backend/issues/1055) [#1056](https://github.com/ReliefApplications/ems-backend/issues/1056) [#1057](https://github.com/ReliefApplications/ems-backend/issues/1057)
* Revert "revert changes AB#91806 (#1055)" (#1056) ([4235d2c](https://github.com/ReliefApplications/ems-backend/commit/4235d2c90f9090b04124351c37f183da45392e3c)), closes [AB#91806](https://github.com/AB/issues/91806) [#1055](https://github.com/ReliefApplications/ems-backend/issues/1055) [#1056](https://github.com/ReliefApplications/ems-backend/issues/1056)

# [2.11.0-beta.2](https://github.com/ReliefApplications/ems-backend/compare/v2.11.0-beta.1...v2.11.0-beta.2) (2024-06-17)


### Bug Fixes

* Deleting resource breaks schema ([#1099](https://github.com/ReliefApplications/ems-backend/issues/1099)) ([595f294](https://github.com/ReliefApplications/ems-backend/commit/595f2941e69f3e2271368c8447434dde5155811b))
* types path breaking the build ([8bde904](https://github.com/ReliefApplications/ems-backend/commit/8bde9048a1e8e0b35b70c9be786a3ea0b762a6bd))


### Features

* allow null values in aggregation ([afe4656](https://github.com/ReliefApplications/ems-backend/commit/afe4656ca8e26cf90659a9bffdffbc78c1547ef8))


### Reverts

* Revert "bug: Deleting resource breaks schema (#1099)" (#1101) ([e99b0dc](https://github.com/ReliefApplications/ems-backend/commit/e99b0dccbd3ffec2ec03eb026a35a45b7c342fb2)), closes [#1099](https://github.com/ReliefApplications/ems-backend/issues/1099) [#1101](https://github.com/ReliefApplications/ems-backend/issues/1101)

# [2.11.0-beta.1](https://github.com/ReliefApplications/ems-backend/compare/v2.10.3-beta.1...v2.11.0-beta.1) (2024-06-06)


### Bug Fixes

* allow to skip validation of records ([35fe868](https://github.com/ReliefApplications/ems-backend/commit/35fe8680ec6f92fe78577e7651d7373bbead8cee))
* record validation would not be done correctly for some fields / requests, and make them fail AB[#95404](https://github.com/ReliefApplications/ems-backend/issues/95404) AB[#95398](https://github.com/ReliefApplications/ems-backend/issues/95398) ([2ecfe0f](https://github.com/ReliefApplications/ems-backend/commit/2ecfe0f0c026808dd9d07c4b5a7f49a819956eb0))


### Features

* add canDownloadRecords permission ([#1095](https://github.com/ReliefApplications/ems-backend/issues/1095)) ([abc3e05](https://github.com/ReliefApplications/ems-backend/commit/abc3e05fea50edee6e3ed4b7cc00bc83f6f9de71))

## [2.10.3-beta.1](https://github.com/ReliefApplications/ems-backend/compare/v2.10.2...v2.10.3-beta.1) (2024-06-05)


### Bug Fixes

* add better handling for file upload AB[#64764](https://github.com/ReliefApplications/ems-backend/issues/64764) ([85279df](https://github.com/ReliefApplications/ems-backend/commit/85279df8faee69f3645ddc1cebd6cd01fa999c02))


### Reverts

* Revert "Revert "revert changes AB#91806 (#1055)" (#1056)" (#1057) ([b6c7ec7](https://github.com/ReliefApplications/ems-backend/commit/b6c7ec7b62e50fc529abf2965214fac90a048598)), closes [AB#91806](https://github.com/AB/issues/91806) [#1055](https://github.com/ReliefApplications/ems-backend/issues/1055) [#1056](https://github.com/ReliefApplications/ems-backend/issues/1056) [#1057](https://github.com/ReliefApplications/ems-backend/issues/1057)
* Revert "revert changes AB#91806 (#1055)" (#1056) ([4235d2c](https://github.com/ReliefApplications/ems-backend/commit/4235d2c90f9090b04124351c37f183da45392e3c)), closes [AB#91806](https://github.com/AB/issues/91806) [#1055](https://github.com/ReliefApplications/ems-backend/issues/1055) [#1056](https://github.com/ReliefApplications/ems-backend/issues/1056)

## [2.10.1-beta.1](https://github.com/ReliefApplications/ems-backend/compare/v2.10.0...v2.10.1-beta.1) (2024-05-24)


### Bug Fixes

* add better handling for file upload AB[#64764](https://github.com/ReliefApplications/ems-backend/issues/64764) ([85279df](https://github.com/ReliefApplications/ems-backend/commit/85279df8faee69f3645ddc1cebd6cd01fa999c02))


### Reverts

* Revert "Revert "revert changes AB#91806 (#1055)" (#1056)" (#1057) ([b6c7ec7](https://github.com/ReliefApplications/ems-backend/commit/b6c7ec7b62e50fc529abf2965214fac90a048598)), closes [AB#91806](https://github.com/AB/issues/91806) [#1055](https://github.com/ReliefApplications/ems-backend/issues/1055) [#1056](https://github.com/ReliefApplications/ems-backend/issues/1056) [#1057](https://github.com/ReliefApplications/ems-backend/issues/1057)
* Revert "revert changes AB#91806 (#1055)" (#1056) ([4235d2c](https://github.com/ReliefApplications/ems-backend/commit/4235d2c90f9090b04124351c37f183da45392e3c)), closes [AB#91806](https://github.com/AB/issues/91806) [#1055](https://github.com/ReliefApplications/ems-backend/issues/1055) [#1056](https://github.com/ReliefApplications/ems-backend/issues/1056)

# [2.4.0-beta.4](https://github.com/ReliefApplications/ems-backend/compare/v2.4.0-beta.3...v2.4.0-beta.4) (2023-12-18)


### Bug Fixes

* aggregation on reference data not working correctly ([392b624](https://github.com/ReliefApplications/ems-backend/commit/392b6241db5b4dc11591bdd0918046d96f4ed74c))


### Features

* support unwind in ref data aggregations ([#893](https://github.com/ReliefApplications/ems-backend/issues/893)) ([a041262](https://github.com/ReliefApplications/ems-backend/commit/a041262c3433495be28d83b49e0454904cff1759))

# [2.4.0-beta.3](https://github.com/ReliefApplications/ems-backend/compare/v2.4.0-beta.2...v2.4.0-beta.3) (2023-12-18)


### Features

* allow to use context in page widgets ([#595](https://github.com/ReliefApplications/ems-backend/issues/595)) ([e2772dc](https://github.com/ReliefApplications/ems-backend/commit/e2772dc0664e67e3c8557b22782d89ca8b23d742))

# [2.4.0-beta.2](https://github.com/ReliefApplications/ems-backend/compare/v2.4.0-beta.1...v2.4.0-beta.2) (2023-12-16)


### Bug Fixes

* aggregation not working fine for most ref data ([#877](https://github.com/ReliefApplications/ems-backend/issues/877)) ([27740e2](https://github.com/ReliefApplications/ems-backend/commit/27740e29377c31abf53611612fae8d87e0cb0c3e))
* revert changes on time fields in exports ([5d60245](https://github.com/ReliefApplications/ems-backend/commit/5d60245d0c7d7a69cf31ebe944143e768234b862))


### Features

* add support for reference data aggregations in layers ([#875](https://github.com/ReliefApplications/ems-backend/issues/875)) ([cb7af9a](https://github.com/ReliefApplications/ems-backend/commit/cb7af9a127e917241c421acf82cfe074c8e752d7))
* allow filtering on ref data aggregations ([#885](https://github.com/ReliefApplications/ems-backend/issues/885)) ([8c4fec3](https://github.com/ReliefApplications/ems-backend/commit/8c4fec3f212a87a1165a7e699e5b532f1bd21093))
* allow to preview aggregation data ([#886](https://github.com/ReliefApplications/ems-backend/issues/886)) ([3952cb5](https://github.com/ReliefApplications/ems-backend/commit/3952cb5a42ed91213579818c9efd58b7a6dd033a))
* use context filter in ref data aggregation ([843c5c0](https://github.com/ReliefApplications/ems-backend/commit/843c5c0301dc077ded2a664cece3628d20cb3799))

# [2.4.0-beta.1](https://github.com/ReliefApplications/ems-backend/compare/v2.3.0...v2.4.0-beta.1) (2023-12-12)


### Features

* allow reference data to be used in charts ([#867](https://github.com/ReliefApplications/ems-backend/issues/867)) ([56a1d79](https://github.com/ReliefApplications/ems-backend/commit/56a1d79b2b440179db9fe34b88ba37469a9a8fb7)), closes [#68346](https://github.com/ReliefApplications/ems-backend/issues/68346) [#68346](https://github.com/ReliefApplications/ems-backend/issues/68346) [#68346](https://github.com/ReliefApplications/ems-backend/issues/68346)

# [2.3.0-beta.1](https://github.com/ReliefApplications/ems-backend/compare/v2.2.0...v2.3.0-beta.1) (2023-12-11)


### Features

* allow reference data to be used in charts ([#867](https://github.com/ReliefApplications/ems-backend/issues/867)) ([56a1d79](https://github.com/ReliefApplications/ems-backend/commit/56a1d79b2b440179db9fe34b88ba37469a9a8fb7)), closes [#68346](https://github.com/ReliefApplications/ems-backend/issues/68346) [#68346](https://github.com/ReliefApplications/ems-backend/issues/68346) [#68346](https://github.com/ReliefApplications/ems-backend/issues/68346)

# [2.2.0-beta.15](https://github.com/ReliefApplications/ems-backend/compare/v2.2.0-beta.14...v2.2.0-beta.15) (2023-12-08)


### Bug Fixes

* add access tokens to all internal requests ([067bd1c](https://github.com/ReliefApplications/ems-backend/commit/067bd1c788070a05c02053eb8919c5ddf2e1288e))
* boolean would not correctly be calculated in getFilter ([58dc862](https://github.com/ReliefApplications/ems-backend/commit/58dc8621b4237e92eb6f17e5b189be647bd86ad3))
* cloning application would not clone filter & grid options in dashboards ([3162811](https://github.com/ReliefApplications/ems-backend/commit/3162811fdc0c2775190d9abce12d6fd3f8031d99))
* could not always get fields from ref data ([32e83d4](https://github.com/ReliefApplications/ems-backend/commit/32e83d44995fc7fe1e2c5d8f191cb0a6211f4739))
* incorrect display of date fields in export & history ([#857](https://github.com/ReliefApplications/ems-backend/issues/857)) ([5262f8b](https://github.com/ReliefApplications/ems-backend/commit/5262f8b5c50315633ff45bc3a777fd7dcd1c4a87))
* reference data not getting exported ([#858](https://github.com/ReliefApplications/ems-backend/issues/858)) ([24ad915](https://github.com/ReliefApplications/ems-backend/commit/24ad915ba5eceb38d263c2094372f6d15d30a4fb))

# [2.2.0-beta.14](https://github.com/ReliefApplications/ems-backend/compare/v2.2.0-beta.13...v2.2.0-beta.14) (2023-12-05)


### Bug Fixes

* incorrect sorting on api configurations ([#852](https://github.com/ReliefApplications/ems-backend/issues/852)) ([1260ceb](https://github.com/ReliefApplications/ems-backend/commit/1260cebd5c88b7a6da8236a723a422729ab88723))

# [2.2.0-beta.13](https://github.com/ReliefApplications/ems-backend/compare/v2.2.0-beta.12...v2.2.0-beta.13) (2023-12-04)


### Bug Fixes

* client flow authentication would not work due to incorrect update when migrating mongoose version ([18a4683](https://github.com/ReliefApplications/ems-backend/commit/18a46838c35b3d1e84964c7898095752736f9fa1))

# [2.2.0-beta.12](https://github.com/ReliefApplications/ems-backend/compare/v2.2.0-beta.11...v2.2.0-beta.12) (2023-12-02)


### Bug Fixes

* Add default values for gridOptions in DashboardType to prevent unwanted results when going from one dashboard to another one ([#844](https://github.com/ReliefApplications/ems-backend/issues/844)) ([f48459f](https://github.com/ReliefApplications/ems-backend/commit/f48459f1c2eb2ab8dd98e016ef617b542a33cd41))
* grant ability to read api configuration & reference data to all records ([d45c394](https://github.com/ReliefApplications/ems-backend/commit/d45c394beac565915fe968fbc4c7285c6fb127ce))

# [2.2.0-beta.11](https://github.com/ReliefApplications/ems-backend/compare/v2.2.0-beta.10...v2.2.0-beta.11) (2023-11-30)


### Bug Fixes

* ability on records could fail due to missing resource ([b217df1](https://github.com/ReliefApplications/ems-backend/commit/b217df11982ecfdbe51293ceb3d9b0a1968521f1))
* added sorting on id field to avoid having missing records ([#842](https://github.com/ReliefApplications/ems-backend/issues/842)) ([935fe1b](https://github.com/ReliefApplications/ems-backend/commit/935fe1b24be318485bf28faa9bc9f53d5e22df81))
* audience would not be available ([4e76800](https://github.com/ReliefApplications/ems-backend/commit/4e76800656354c10f3c1497ae98bc33f2bfff9ee))
* build would fail due to incorrect default value for auth audience ([8985cc0](https://github.com/ReliefApplications/ems-backend/commit/8985cc05b4d52571be6362995c90c54eed3fcc57))
* incorrect mutation to set filter at dashboard level ([2d57100](https://github.com/ReliefApplications/ems-backend/commit/2d5710036e9eab6780137f7a129cc7190628866c))
* some permissions issues when not admin ([794683d](https://github.com/ReliefApplications/ems-backend/commit/794683d7eeda6e82a8b0791250c7ce788a3ac984))
* users who can edit application can now delete the steps & pages ([cf130ce](https://github.com/ReliefApplications/ems-backend/commit/cf130ce61d82a6b3690dd092239e79b2015e75db))


### Features

* now use filter at dashboard level ([#834](https://github.com/ReliefApplications/ems-backend/issues/834)) ([6b3f4e9](https://github.com/ReliefApplications/ems-backend/commit/6b3f4e9dfcacdf2fd51c787eaba958a0c392f1a5))

# [2.2.0-beta.10](https://github.com/ReliefApplications/ems-backend/compare/v2.2.0-beta.9...v2.2.0-beta.10) (2023-11-27)


### Bug Fixes

* redis client error ([2c45593](https://github.com/ReliefApplications/ems-backend/commit/2c4559334e937b62e98bfdf3bea250b36ce5f5eb))
* upload would fail most of the time for tagbox / checkbox questions ([243f77d](https://github.com/ReliefApplications/ems-backend/commit/243f77d33971455cd1f26995d11c36dc3e37d154))

# [2.2.0-beta.9](https://github.com/ReliefApplications/ems-backend/compare/v2.2.0-beta.8...v2.2.0-beta.9) (2023-11-24)


### Bug Fixes

* add resource fields to history ([71e708d](https://github.com/ReliefApplications/ems-backend/commit/71e708dcfb4f36f6b955624cc15fbfc09a3b4c38))
* allow parallel sorting in aggregations ([#798](https://github.com/ReliefApplications/ems-backend/issues/798)) ([8b7a8ec](https://github.com/ReliefApplications/ems-backend/commit/8b7a8ec84346afc686190d2b7d321375b71d7b74))
* check of calculated fields in pipeline of 'all' query could break some queries ([00e88f8](https://github.com/ReliefApplications/ems-backend/commit/00e88f8087726ba896a35f898049105d1d55062c))
* could not get first createdBy in history ([47b33fd](https://github.com/ReliefApplications/ems-backend/commit/47b33fd25f84c7c49ee09503a1fbe8f41b40473d))
* could not revert past history versions ([d9999a1](https://github.com/ReliefApplications/ems-backend/commit/d9999a1666d12e1282c28b334ce91b0b24cf8142))
* incorrect audience settings ([9c8e710](https://github.com/ReliefApplications/ems-backend/commit/9c8e710c3d08ee2ccea504a2a410dceeccd62735))
* incorrect list of permissions sent to back-office role editor ([#786](https://github.com/ReliefApplications/ems-backend/issues/786)) ([d4377c0](https://github.com/ReliefApplications/ems-backend/commit/d4377c020674c2737d02f1781ff002bf7810cccc))
* incorrect metadata for createdBy / lastUpdatedBy fields ([#829](https://github.com/ReliefApplications/ems-backend/issues/829)) ([c6892f3](https://github.com/ReliefApplications/ems-backend/commit/c6892f35b24d6c2b350599275de82280f9c5630a))
* non-admin users could not download history ([#785](https://github.com/ReliefApplications/ems-backend/issues/785)) ([862fdcc](https://github.com/ReliefApplications/ems-backend/commit/862fdccc44a77264299aac2b47ecfe8024f70b41))
* owner field could create issue in history ([0b08985](https://github.com/ReliefApplications/ems-backend/commit/0b089850852b02b7a70740c97d6aaee33c9a0c0d))
* record history would not correctly display changes on resources for some users ([f2cfa5f](https://github.com/ReliefApplications/ems-backend/commit/f2cfa5f7d9f10613b2fc22d1a46ae65bce098bd3))
* some requests could not be cached due to incorrect method check ([61e44c7](https://github.com/ReliefApplications/ems-backend/commit/61e44c7a2c03160a81d4d3d7fcaa05e43ec1dbb6))
* updated editApiConfiguration mutation ([#793](https://github.com/ReliefApplications/ems-backend/issues/793)) ([dbe15c6](https://github.com/ReliefApplications/ems-backend/commit/dbe15c6cfb7b9754c2f06bda671bc4b43acc1885))
* users roles not appearing in applications ([#835](https://github.com/ReliefApplications/ems-backend/issues/835)) ([d05d061](https://github.com/ReliefApplications/ems-backend/commit/d05d0619635bb2c26ac902fc06789b6d58b899c7))
* using size operator on nullish values in aggregations on records ([#836](https://github.com/ReliefApplications/ems-backend/issues/836)) ([5eca1c7](https://github.com/ReliefApplications/ems-backend/commit/5eca1c704264fee19eb555f34ec6860326fa44df))


### Features

* allow caching of more API requests ([#825](https://github.com/ReliefApplications/ems-backend/issues/825)) ([105f0a5](https://github.com/ReliefApplications/ems-backend/commit/105f0a50685363f6eab3bc936df308774b7e7015))

# [2.2.0-beta.8](https://github.com/ReliefApplications/ems-backend/compare/v2.2.0-beta.7...v2.2.0-beta.8) (2023-11-20)


### Bug Fixes

* ping request using cache and decrypting twice ([#826](https://github.com/ReliefApplications/ems-backend/issues/826)) ([14b26c4](https://github.com/ReliefApplications/ems-backend/commit/14b26c4e125d22fd489afce95cf060f51cda07f8))


### Features

* can save custom grid options per dashboard ([#824](https://github.com/ReliefApplications/ems-backend/issues/824)) ([8779433](https://github.com/ReliefApplications/ems-backend/commit/87794338b35f5b393e22ea4e6aa2901cf346a411))

# [2.2.0-beta.7](https://github.com/ReliefApplications/oort-backend/compare/v2.2.0-beta.6...v2.2.0-beta.7) (2023-11-09)


### Bug Fixes

* editRecord would not correctly check non editable fields ([#815](https://github.com/ReliefApplications/oort-backend/issues/815)) ([5ca7717](https://github.com/ReliefApplications/oort-backend/commit/5ca771719a84e1eee9771293ac4e979bb39e9849))
* in some edge cases, dashboard structure would be incorrectly passed in graphql ([#817](https://github.com/ReliefApplications/oort-backend/issues/817)) ([2a5866e](https://github.com/ReliefApplications/oort-backend/commit/2a5866eca15f0fd26a2c24378a46a3fac50f3490))


### Features

* Ability to save draft record ([#802](https://github.com/ReliefApplications/oort-backend/issues/802)) ([d1b1e3b](https://github.com/ReliefApplications/oort-backend/commit/d1b1e3b263b5db5211edfc8e7c3deee05f2517bf))

# [2.2.0-beta.6](https://github.com/ReliefApplications/oort-backend/compare/v2.2.0-beta.5...v2.2.0-beta.6) (2023-11-07)


### Features

* add auth code APIs ([#789](https://github.com/ReliefApplications/oort-backend/issues/789)) ([20ff5d8](https://github.com/ReliefApplications/oort-backend/commit/20ff5d8b9732b5882a98f9440411c8d69ef47986))
* can now hide application menu by default ([2519344](https://github.com/ReliefApplications/oort-backend/commit/2519344d7bffa0f761599da8846a8db5ecf60270))

# [2.2.0-beta.5](https://github.com/ReliefApplications/oort-backend/compare/v2.2.0-beta.4...v2.2.0-beta.5) (2023-10-30)


### Bug Fixes

* could not download application with existing name ([#795](https://github.com/ReliefApplications/oort-backend/issues/795)) ([c9f9d8a](https://github.com/ReliefApplications/oort-backend/commit/c9f9d8a07ce8e64a4e9b873df14c2ff6ddbe8baa))
* prevent contextual content in pages to be duplicated ([926f476](https://github.com/ReliefApplications/oort-backend/commit/926f476af9e1f1de3ff5d78ab4398872ebfdaf1f))

# [2.2.0-beta.4](https://github.com/ReliefApplications/oort-backend/compare/v2.2.0-beta.3...v2.2.0-beta.4) (2023-10-20)


### Bug Fixes

* api configuration would incorrectly save edit api configuration auth type ([e97a8d7](https://github.com/ReliefApplications/oort-backend/commit/e97a8d7d6e3b96ef8c6ff83980db8eaca62d24bb))

# [2.2.0-beta.3](https://github.com/ReliefApplications/oort-backend/compare/v2.2.0-beta.2...v2.2.0-beta.3) (2023-10-18)


### Bug Fixes

* playground was unavailable due to apollo update ([#778](https://github.com/ReliefApplications/oort-backend/issues/778)) ([31534b5](https://github.com/ReliefApplications/oort-backend/commit/31534b5b8d547f2a9ff3ca308884f3b97ec10dd9))

# [2.2.0-beta.2](https://github.com/ReliefApplications/oort-backend/compare/v2.2.0-beta.1...v2.2.0-beta.2) (2023-10-16)


### Bug Fixes

* download of template for records upload would query records even if not needed ([b263bdb](https://github.com/ReliefApplications/oort-backend/commit/b263bdb59750698368131c9ed4ac7d89429767fe))
* number question values, when saved as string, would not match in filters ([#774](https://github.com/ReliefApplications/oort-backend/issues/774)) ([2dc18ec](https://github.com/ReliefApplications/oort-backend/commit/2dc18ecd0a7241d8718f6cadfe915e5f42f975f2))
* unfriendly api configuration edition ([#766](https://github.com/ReliefApplications/oort-backend/issues/766)) ([33b7901](https://github.com/ReliefApplications/oort-backend/commit/33b79010f9fa3b4602e75c3c01da09b74a584483))

# [2.2.0-beta.1](https://github.com/ReliefApplications/oort-backend/compare/v2.1.1...v2.2.0-beta.1) (2023-10-04)


### Bug Fixes

* API edit mutation could fail because of incorrect check of arguments ([00b0e0d](https://github.com/ReliefApplications/oort-backend/commit/00b0e0dbd11bd887bde9adef117b3fe8b8b51869))
* build issue after 2.x.x merge ([1d48814](https://github.com/ReliefApplications/oort-backend/commit/1d48814044a29c6b9009f54515737523c5005893))
* calculated fields in resource question breaking search in grid ([c5287eb](https://github.com/ReliefApplications/oort-backend/commit/c5287ebf44d601f6ef62d481bb22f71a62e45bb2))
* check record trigger would break build ([06691dd](https://github.com/ReliefApplications/oort-backend/commit/06691dd816c938a21b94bb4b0efd994c81bf8df2))
* code could not compile ([5699e03](https://github.com/ReliefApplications/oort-backend/commit/5699e03e19b8204c4a66bc5af9a0056955311abf))
* contains filter not working if value is single ([b7e5558](https://github.com/ReliefApplications/oort-backend/commit/b7e55584e8d5ddbc3bf145f7042f5a7250b4cbe0))
* could not get canUpdate / canDelete on meta ([323330a](https://github.com/ReliefApplications/oort-backend/commit/323330aec8b9822d85527c8967e935a05738a463))
* could not get map data due to incorrect id check ([6906c21](https://github.com/ReliefApplications/oort-backend/commit/6906c21dcbae6564c1a5c554ff7b576eb268cac3))
* could not load datasources in layers ([9e1b841](https://github.com/ReliefApplications/oort-backend/commit/9e1b841200852f284680aee9ba045730bc2c3f03))
* dashboard queries would take too much time if context ([7783bff](https://github.com/ReliefApplications/oort-backend/commit/7783bff5a58fb06fb2697924a4eafa6b21548fce))
* disable custom notifications scheduler to prevent system to crash ([00c3e22](https://github.com/ReliefApplications/oort-backend/commit/00c3e22ca757a1f14562c4ce4e2a2b99ea20ca1d))
* Download file method would break due to missing file destination ([aac3f63](https://github.com/ReliefApplications/oort-backend/commit/aac3f63ba4494db672cc4b82b26d63fc6c5ef734))
* download file would sometimes not throw correct error or resolve request ([46e2cc6](https://github.com/ReliefApplications/oort-backend/commit/46e2cc6f96861bc9823780615e3ef22291738b70))
* editing a dashboard inside a workflow could cause unexpected type issue due to incorrect error handling ([75ccd9a](https://github.com/ReliefApplications/oort-backend/commit/75ccd9a96f7acfd8eb7970e57644f055becaec34))
* editRecord could break if previous version did not have any data ([85a2d5c](https://github.com/ReliefApplications/oort-backend/commit/85a2d5c3cd7c7e1a064aed51b9929febbf3296d2))
* error on fetching records with no data ([4986e1d](https://github.com/ReliefApplications/oort-backend/commit/4986e1dfebf40170bde92fe875c7eab4e6875707))
* filtering records on form name would break query ([c2d8e58](https://github.com/ReliefApplications/oort-backend/commit/c2d8e58601bd73c2362d672bab4e84a00870896a))
* geofiltering would break layers if empty ([c22a882](https://github.com/ReliefApplications/oort-backend/commit/c22a8827f1f8e9b5b554f2b80bba971df8611de6))
* gis/feature route was broken due to incorrect layout / aggregation setup ([7a3cdd7](https://github.com/ReliefApplications/oort-backend/commit/7a3cdd70457f59ebca31d13ba36b3ea114c6f518))
* graphQL queries would be cached by proxy ([1dd9fba](https://github.com/ReliefApplications/oort-backend/commit/1dd9fba9f67b99674599c83dd9b267a081ef47fa))
* inccorect filter in getautoassigned role ([41a0143](https://github.com/ReliefApplications/oort-backend/commit/41a0143723ea06410388490b73a6383630105189))
* incorrect names for some matrix questions ([1fedb51](https://github.com/ReliefApplications/oort-backend/commit/1fedb51ed129924e47aeb68499bc236287d96091))
* incorrect timezone in calculated fields. Now enforcing user timezone ([296aab4](https://github.com/ReliefApplications/oort-backend/commit/296aab4a1d4bd102fb7b2f8858fb71914f31fd62))
* issue with layers using lat lng fields ([88f75f6](https://github.com/ReliefApplications/oort-backend/commit/88f75f6899c6e0a4da40bee2a7ffc195b2b2d5af))
* layer input could not allow saving of heatmap layer ([6da8988](https://github.com/ReliefApplications/oort-backend/commit/6da89881a76b022ec236926a933fdcc9930d7ea4))
* layers using lat & long could break popup ([#722](https://github.com/ReliefApplications/oort-backend/issues/722)) ([70217f5](https://github.com/ReliefApplications/oort-backend/commit/70217f5abf6b1aeb66c63352d532001450afa2fa))
* matrix in grid and summary card not correctly saved in db ([#748](https://github.com/ReliefApplications/oort-backend/issues/748)) ([e37b342](https://github.com/ReliefApplications/oort-backend/commit/e37b3422b47a39c55bb77486e08dc79cd430c937))
* prevent any default field to be used in a form ([6e52fda](https://github.com/ReliefApplications/oort-backend/commit/6e52fda5e936d2f95ec18f7a00c5b2cf18023a11))
* pulljobs failing would crash server ([e416ee5](https://github.com/ReliefApplications/oort-backend/commit/e416ee5f6c711b5c705c8956c4a4478005728cc9))
* reference data query not working due to incorrect cursor pagination ([96d7298](https://github.com/ReliefApplications/oort-backend/commit/96d7298796d2d952ad6f66dd745fa4000cf46567))
* some layers would not work due to incorrect geoField ([f409b1c](https://github.com/ReliefApplications/oort-backend/commit/f409b1c5547b9f7c74a239e72d3f84236923e4e1))
* updated layer model to also saves popup fields info ([#670](https://github.com/ReliefApplications/oort-backend/issues/670)) ([eb43289](https://github.com/ReliefApplications/oort-backend/commit/eb43289336b5d630ed277862ea6500577d225fb3))


### Features

* add contextual filtering ([0a734e2](https://github.com/ReliefApplications/oort-backend/commit/0a734e27cb427d868b8085206aecac77842ba075))
* add dashboard buttons to schema ([fe7bd55](https://github.com/ReliefApplications/oort-backend/commit/fe7bd55de6931364db0c08f90a4c4da143e2d006))
* add new route of scss conversion to css ([691794d](https://github.com/ReliefApplications/oort-backend/commit/691794d4e873776e4aeb0b23a6abcc0eb9741f03))
* allow draft edition of records ([32148b1](https://github.com/ReliefApplications/oort-backend/commit/32148b1ff093d0553a3124bf0a32b0e6d3eebe49)), closes [feat/AB#65023](https://github.com/feat/AB/issues/65023)
* Allow MultiPoint and MultiPolygon on layer features ([514d3ee](https://github.com/ReliefApplications/oort-backend/commit/514d3eefcbc1bbaf0c755ecbeed0e8fca3dbb66b))
* allow single widget page ([53762f4](https://github.com/ReliefApplications/oort-backend/commit/53762f43aaf1c219c60aac01d9a479495fd75a11))
* can now archive application pages and restore them ([a76928a](https://github.com/ReliefApplications/oort-backend/commit/a76928a93e482911c114d71c289beb7c6a7e70e2))
* can now edit page / step 's icons ([#749](https://github.com/ReliefApplications/oort-backend/issues/749)) ([30bb81c](https://github.com/ReliefApplications/oort-backend/commit/30bb81cdecb2a4c27195c1654544db887b5ff79e))
* can now group layers ([074cb2b](https://github.com/ReliefApplications/oort-backend/commit/074cb2b9cb5cdce22e5aadf81e641240a5d77fa6))
* can now query historical data ([#752](https://github.com/ReliefApplications/oort-backend/issues/752)) ([75b1c8a](https://github.com/ReliefApplications/oort-backend/commit/75b1c8ac78131455c5019129e83e76534b27e2a3))
* can now sort aggregations on records ([a09f2c8](https://github.com/ReliefApplications/oort-backend/commit/a09f2c8b9924e9cb7b179b8acce89b281c3b9fe3))
* can now use infinite aggregations ([3f190d4](https://github.com/ReliefApplications/oort-backend/commit/3f190d407029b09d22d5ab2cc60d377175e5d776))
* cluster layers now support new options ([#757](https://github.com/ReliefApplications/oort-backend/issues/757)) ([f9b58b3](https://github.com/ReliefApplications/oort-backend/commit/f9b58b317d8838c8226ff87f3b2112f7f739db28))
* get draft data from single record custom query, by passing data argument ([509b670](https://github.com/ReliefApplications/oort-backend/commit/509b67044190f1dcdc17c74f6b3c28ddd8168400))
* possibility to hide pages' ([f5ca2e6](https://github.com/ReliefApplications/oort-backend/commit/f5ca2e65698cc26fac6a91220e844eae0252e9fb))
* query of polygon features on map ([fc33c06](https://github.com/ReliefApplications/oort-backend/commit/fc33c06d2c598e68d4394ab503d23d6507889292))

# [2.1.0-beta.5](https://github.com/ReliefApplications/oort-backend/compare/v2.1.0-beta.4...v2.1.0-beta.5) (2023-09-14)


### Bug Fixes

* calculated fields edition would not trigger schema update ([23a1bbd](https://github.com/ReliefApplications/oort-backend/commit/23a1bbd8446d5009417da1790292ae0ba57d9dac))
* could not get map data due to incorrect id check ([6906c21](https://github.com/ReliefApplications/oort-backend/commit/6906c21dcbae6564c1a5c554ff7b576eb268cac3))
* in record history, some updates would appear in the UI but not in the download ([98e5d37](https://github.com/ReliefApplications/oort-backend/commit/98e5d3795608d990f0ceb38e65cd24fb0cc2adb5))
* only fetch visible fields in export [#35940](https://github.com/ReliefApplications/oort-backend/issues/35940) ([#730](https://github.com/ReliefApplications/oort-backend/issues/730)) ([7effd81](https://github.com/ReliefApplications/oort-backend/commit/7effd81dfb216535f6b6b5349711e2605d5fa6a7))
* only restart server on resource changes, if a calculated field is updated ([a041f13](https://github.com/ReliefApplications/oort-backend/commit/a041f131fc487f24e8943fd99be0abae80c1d388))
* reference data query not working due to incorrect cursor pagination ([96d7298](https://github.com/ReliefApplications/oort-backend/commit/96d7298796d2d952ad6f66dd745fa4000cf46567))
* some users without admin permissions on form could not download file ([3963550](https://github.com/ReliefApplications/oort-backend/commit/396355007c7c85566915f45235818101535c43b4))
* unavailable api configuration while fetching user attributes could break ([68e7be4](https://github.com/ReliefApplications/oort-backend/commit/68e7be414a22801fa930321620f62657513b9b3d))
* unavailable api configuration while update user groups could break ([11104fa](https://github.com/ReliefApplications/oort-backend/commit/11104fa15a2dc7f5226610922ad7561eb1b8180f))

# [2.1.0-beta.4](https://github.com/ReliefApplications/oort-backend/compare/v2.1.0-beta.3...v2.1.0-beta.4) (2023-09-05)


### Bug Fixes

* dashboard queries would take too much time if context ([7783bff](https://github.com/ReliefApplications/oort-backend/commit/7783bff5a58fb06fb2697924a4eafa6b21548fce))
* layers using lat & long could break popup ([#722](https://github.com/ReliefApplications/oort-backend/issues/722)) ([70217f5](https://github.com/ReliefApplications/oort-backend/commit/70217f5abf6b1aeb66c63352d532001450afa2fa))

# [2.1.0-beta.3](https://github.com/ReliefApplications/oort-backend/compare/v2.1.0-beta.2...v2.1.0-beta.3) (2023-08-23)


### Bug Fixes

* check record trigger would break build ([06691dd](https://github.com/ReliefApplications/oort-backend/commit/06691dd816c938a21b94bb4b0efd994c81bf8df2))
* incorrect names for some matrix questions ([1fedb51](https://github.com/ReliefApplications/oort-backend/commit/1fedb51ed129924e47aeb68499bc236287d96091))
* some layers would not work due to incorrect geoField ([f409b1c](https://github.com/ReliefApplications/oort-backend/commit/f409b1c5547b9f7c74a239e72d3f84236923e4e1))


### Features

* allow draft edition of records ([32148b1](https://github.com/ReliefApplications/oort-backend/commit/32148b1ff093d0553a3124bf0a32b0e6d3eebe49)), closes [feat/AB#65023](https://github.com/feat/AB/issues/65023)

# [2.1.0-beta.2](https://github.com/ReliefApplications/oort-backend/compare/v2.1.0-beta.1...v2.1.0-beta.2) (2023-08-17)


### Bug Fixes

* aggregations on resource question could fail due to incorrect objectId conversion ([d6e5980](https://github.com/ReliefApplications/oort-backend/commit/d6e59805b5a5ecbb7f4cfbc923164b1c16451fbf))
* API edit mutation could fail because of incorrect check of arguments ([00b0e0d](https://github.com/ReliefApplications/oort-backend/commit/00b0e0dbd11bd887bde9adef117b3fe8b8b51869))
* calculated fields in resource question breaking search in grid ([c5287eb](https://github.com/ReliefApplications/oort-backend/commit/c5287ebf44d601f6ef62d481bb22f71a62e45bb2))
* choicesByUrl could break checkRecordValidation method ([98c15bd](https://github.com/ReliefApplications/oort-backend/commit/98c15bd836f1f3d31f0f0711b6c320cca2447bb3))
* comments could raise validation errors in survey, due to incorrect settings in validation method ([cf3adbd](https://github.com/ReliefApplications/oort-backend/commit/cf3adbde90d5cc208898d2278f95f4244380511d))
* contains filter not working if value is single ([b7e5558](https://github.com/ReliefApplications/oort-backend/commit/b7e55584e8d5ddbc3bf145f7042f5a7250b4cbe0))
* disable custom notifications scheduler to prevent system to crash ([00c3e22](https://github.com/ReliefApplications/oort-backend/commit/00c3e22ca757a1f14562c4ce4e2a2b99ea20ca1d))
* Download file method would break due to missing file destination ([aac3f63](https://github.com/ReliefApplications/oort-backend/commit/aac3f63ba4494db672cc4b82b26d63fc6c5ef734))
* download file would sometimes not throw correct error or resolve request ([46e2cc6](https://github.com/ReliefApplications/oort-backend/commit/46e2cc6f96861bc9823780615e3ef22291738b70))
* editing a user role in application would prevent to see roles of the user in other application, in the UI ([f1c0afa](https://github.com/ReliefApplications/oort-backend/commit/f1c0afadec79c87d4902c074f26b18439968db3d))
* filtering records on form name would break query ([c2d8e58](https://github.com/ReliefApplications/oort-backend/commit/c2d8e58601bd73c2362d672bab4e84a00870896a))
* incorrect timezone in calculated fields. Now enforcing user timezone ([296aab4](https://github.com/ReliefApplications/oort-backend/commit/296aab4a1d4bd102fb7b2f8858fb71914f31fd62))
* pagination on users for application & role would not work ([95ae809](https://github.com/ReliefApplications/oort-backend/commit/95ae809483ef8baa61554488723bb0752da419b1))
* pull job could not insert records due to missing property in addition of new records ([700c1ab](https://github.com/ReliefApplications/oort-backend/commit/700c1ab087b1869a3295b2acaa9cd0ec4b23106f))
* pulljobs failing would crash server ([e416ee5](https://github.com/ReliefApplications/oort-backend/commit/e416ee5f6c711b5c705c8956c4a4478005728cc9))
* search while displaying user would break ([b271647](https://github.com/ReliefApplications/oort-backend/commit/b271647df636153ba4fd78d75cbf30090ece60f9))
* transformRecord could cause issue if resources question was empty ([e8515d6](https://github.com/ReliefApplications/oort-backend/commit/e8515d68dcab6e03935d3a5a5329f6a83c429c7f))
* typo error in ping proxy route would make it fail for service to service APIs ([5903ecf](https://github.com/ReliefApplications/oort-backend/commit/5903ecfc6b491177c4e54911e7056a256df64264))
* updated layer model to also saves popup fields info ([#670](https://github.com/ReliefApplications/oort-backend/issues/670)) ([eb43289](https://github.com/ReliefApplications/oort-backend/commit/eb43289336b5d630ed277862ea6500577d225fb3))


### Features

* add contextual filtering ([0a734e2](https://github.com/ReliefApplications/oort-backend/commit/0a734e27cb427d868b8085206aecac77842ba075))
* add new route of scss conversion to css ([691794d](https://github.com/ReliefApplications/oort-backend/commit/691794d4e873776e4aeb0b23a6abcc0eb9741f03))
* Allow MultiPoint and MultiPolygon on layer features ([514d3ee](https://github.com/ReliefApplications/oort-backend/commit/514d3eefcbc1bbaf0c755ecbeed0e8fca3dbb66b))
* allow single widget page ([53762f4](https://github.com/ReliefApplications/oort-backend/commit/53762f43aaf1c219c60aac01d9a479495fd75a11))

# [2.1.0-beta.1](https://github.com/ReliefApplications/oort-backend/compare/v2.0.0...v2.1.0-beta.1) (2023-07-03)


### Bug Fixes

* code could not compile ([5699e03](https://github.com/ReliefApplications/oort-backend/commit/5699e03e19b8204c4a66bc5af9a0056955311abf))
* could not get canUpdate / canDelete on meta ([323330a](https://github.com/ReliefApplications/oort-backend/commit/323330aec8b9822d85527c8967e935a05738a463))
* could not load datasources in layers ([9e1b841](https://github.com/ReliefApplications/oort-backend/commit/9e1b841200852f284680aee9ba045730bc2c3f03))
* editing a dashboard inside a workflow could cause unexpected type issue due to incorrect error handling ([75ccd9a](https://github.com/ReliefApplications/oort-backend/commit/75ccd9a96f7acfd8eb7970e57644f055becaec34))
* editRecord could break if previous version did not have any data ([85a2d5c](https://github.com/ReliefApplications/oort-backend/commit/85a2d5c3cd7c7e1a064aed51b9929febbf3296d2))
* error on fetching records with no data ([4986e1d](https://github.com/ReliefApplications/oort-backend/commit/4986e1dfebf40170bde92fe875c7eab4e6875707))
* geofiltering would break layers if empty ([c22a882](https://github.com/ReliefApplications/oort-backend/commit/c22a8827f1f8e9b5b554f2b80bba971df8611de6))
* gis/feature route was broken due to incorrect layout / aggregation setup ([7a3cdd7](https://github.com/ReliefApplications/oort-backend/commit/7a3cdd70457f59ebca31d13ba36b3ea114c6f518))
* inccorect filter in getautoassigned role ([41a0143](https://github.com/ReliefApplications/oort-backend/commit/41a0143723ea06410388490b73a6383630105189))
* issue with layers using lat lng fields ([88f75f6](https://github.com/ReliefApplications/oort-backend/commit/88f75f6899c6e0a4da40bee2a7ffc195b2b2d5af))
* layer input could not allow saving of heatmap layer ([6da8988](https://github.com/ReliefApplications/oort-backend/commit/6da89881a76b022ec236926a933fdcc9930d7ea4))
* prevent any default field to be used in a form ([6e52fda](https://github.com/ReliefApplications/oort-backend/commit/6e52fda5e936d2f95ec18f7a00c5b2cf18023a11))


### Features

* add dashboard buttons to schema ([fe7bd55](https://github.com/ReliefApplications/oort-backend/commit/fe7bd55de6931364db0c08f90a4c4da143e2d006))
* can now group layers ([074cb2b](https://github.com/ReliefApplications/oort-backend/commit/074cb2b9cb5cdce22e5aadf81e641240a5d77fa6))
* possibility to hide pages' ([f5ca2e6](https://github.com/ReliefApplications/oort-backend/commit/f5ca2e65698cc26fac6a91220e844eae0252e9fb))
* query of polygon features on map ([fc33c06](https://github.com/ReliefApplications/oort-backend/commit/fc33c06d2c598e68d4394ab503d23d6507889292))

# [2.0.0-beta.17](https://github.com/ReliefApplications/oort-backend/compare/v2.0.0-beta.16...v2.0.0-beta.17) (2023-07-03)


### Bug Fixes

* aggregation from refData ([962ed69](https://github.com/ReliefApplications/oort-backend/commit/962ed69e227cc4c74de8c79c643ad9ab5065fecd))
* convert would not always work ([c940d9e](https://github.com/ReliefApplications/oort-backend/commit/c940d9efb9c9ef96f6f9923966bb3dc36c6d539b))
* getFilter not working ([cd45bab](https://github.com/ReliefApplications/oort-backend/commit/cd45bab5634bd10bfdfa7b53fd3910108678bc31))
* interrupted cascade deletion of resources ([3244ff0](https://github.com/ReliefApplications/oort-backend/commit/3244ff0697a0dccd1b494ebc4dacd4b7a05a678e))
* issue with mapping ([c6678d5](https://github.com/ReliefApplications/oort-backend/commit/c6678d53e064eb9d87ac3b2aa78bc2b6fcb2e5fa))
* mongoose filter from resource question ([5754acd](https://github.com/ReliefApplications/oort-backend/commit/5754acd6a5d1f7693fa74b8ce6c068e99f2873c1))
* users could not be invited if no position attributes ([#639](https://github.com/ReliefApplications/oort-backend/issues/639)) ([e570e2f](https://github.com/ReliefApplications/oort-backend/commit/e570e2f8e7d21b3fe2eb31612727fbaa9a19ff41))

# [2.0.0-beta.16](https://github.com/ReliefApplications/oort-backend/compare/v2.0.0-beta.15...v2.0.0-beta.16) (2023-06-19)


### Bug Fixes

* fields permissions incorrectly being reset ([12379b1](https://github.com/ReliefApplications/oort-backend/commit/12379b141e80887b8b399bee79a58af3e0987343))

# [2.0.0-beta.15](https://github.com/ReliefApplications/oort-backend/compare/v2.0.0-beta.14...v2.0.0-beta.15) (2023-06-19)


### Bug Fixes

* add calculated fields used in sorting/filtering/style to pipeline ([#618](https://github.com/ReliefApplications/oort-backend/issues/618)) ([79aa6dd](https://github.com/ReliefApplications/oort-backend/commit/79aa6dd390c9f84f14f0d397ed9ee7500074d8fc))
* could not get correct error from mutations / queries ([48357e5](https://github.com/ReliefApplications/oort-backend/commit/48357e5ec25088a7d72f9a1ffdfe5f11a29b4da9))
* could not update canSee / canUpdate permissions of some fields ([121364b](https://github.com/ReliefApplications/oort-backend/commit/121364b11b8680cdebdc5f9d280c3fe16ea47c8e))
* getRows maximum page size ([#617](https://github.com/ReliefApplications/oort-backend/issues/617)) ([0139322](https://github.com/ReliefApplications/oort-backend/commit/0139322d92126184de5756a07c4de33486c01af7))
* jsonpath not being reflected for rest ref data ([0c20fe8](https://github.com/ReliefApplications/oort-backend/commit/0c20fe8693be8bb5dc21895a3580606c49fab2c8))
* saving questions from refData ([b19d387](https://github.com/ReliefApplications/oort-backend/commit/b19d387a2fa2a4e13faad260a0f95ad127b6a1a0))
* update editForm mutation to save field permission as objectIds and not string ([#614](https://github.com/ReliefApplications/oort-backend/issues/614)) ([927f0a1](https://github.com/ReliefApplications/oort-backend/commit/927f0a15c2d98d70197115214dff69fca3accddf))


### Features

* add lastUpdateForm meta field ([c1ad0bf](https://github.com/ReliefApplications/oort-backend/commit/c1ad0bf83a6a69792d300a2130de490f4b37987a))

# [2.0.0-beta.14](https://github.com/ReliefApplications/oort-backend/compare/v2.0.0-beta.13...v2.0.0-beta.14) (2023-05-31)


### Bug Fixes

* could not get canUpdate / canDelete on meta ([914575f](https://github.com/ReliefApplications/oort-backend/commit/914575fb663c52fd6ba1f0eae0b4a744c2db6e58))
* incorrect name in export batch ([8b09742](https://github.com/ReliefApplications/oort-backend/commit/8b097422554e54d1be2247f4a2216c579cd88d22))
* permissions not passed to record resolvers ([62313e9](https://github.com/ReliefApplications/oort-backend/commit/62313e91d5bbb1e64f0f355fcc4c496670349ca1))
* prevent pagination to cause payload error ([e488d7e](https://github.com/ReliefApplications/oort-backend/commit/e488d7eabe3e6e5c6d6d5477343be803ac5331f0)), closes [AB#54896](https://github.com/AB/issues/54896) [AB#54896](https://github.com/AB/issues/54896)
* refData from graphQL API ([04c1982](https://github.com/ReliefApplications/oort-backend/commit/04c19823226bee2cd9d0b731860bd89b1d083cd8))
* schema could break due to reference structure not existing ([744e6dd](https://github.com/ReliefApplications/oort-backend/commit/744e6dd8358fad36d5cf4ebe4280b4afc32e63f5))


### Features

* possibility to have pages on top of the app ([e116cbf](https://github.com/ReliefApplications/oort-backend/commit/e116cbf146f612568ac76f4ab62da336a5f218bb))

# [2.0.0-beta.13](https://github.com/ReliefApplications/oort-backend/compare/v2.0.0-beta.12...v2.0.0-beta.13) (2023-05-19)


### Bug Fixes

* hide fields on  roles with no permission ([3de9a25](https://github.com/ReliefApplications/oort-backend/commit/3de9a25a35a9a786338e8e218a6f51c436e591ef))
* incorrect meta data in graphql ([cfdc06b](https://github.com/ReliefApplications/oort-backend/commit/cfdc06bfb4de27f06992a7bda037e0937932a1ff))
* update role resource permissions ([cbd8a1b](https://github.com/ReliefApplications/oort-backend/commit/cbd8a1b2724f964a03dfdad1206dd6492f0544b3))

# [2.0.0-beta.12](https://github.com/ReliefApplications/oort-backend/compare/v2.0.0-beta.11...v2.0.0-beta.12) (2023-05-16)


### Bug Fixes

* incorrect add manage distribution / template permissions migration would create useless permissions ([cfcceae](https://github.com/ReliefApplications/oort-backend/commit/cfcceaed7a2f471c9f35080f9f6e0c4d54bc9755))

# [2.0.0-beta.11](https://github.com/ReliefApplications/oort-backend/compare/v2.0.0-beta.10...v2.0.0-beta.11) (2023-05-15)


### Bug Fixes

* problems regarding calculated fields ([0c457eb](https://github.com/ReliefApplications/oort-backend/commit/0c457eb0b94ee3730e96602b0b09e4df2fbec78e))


### Features

* add manage distribution list permission migration ([03b14c0](https://github.com/ReliefApplications/oort-backend/commit/03b14c0f9309596fc7fec79ca14f3b789250250f))

# [2.0.0-beta.10](https://github.com/ReliefApplications/oort-backend/compare/v2.0.0-beta.9...v2.0.0-beta.10) (2023-05-15)


### Features

* use column width to generate email table ([a1f9c81](https://github.com/ReliefApplications/oort-backend/commit/a1f9c81c366da1d2586b13910b3015827884e63b))
