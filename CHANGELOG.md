# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.2.0](https://github.com/ReliefApplications/emrs-safe-backend/compare/v1.1.1...v1.2.0) (2022-01-12)


### Features

* add other choice support [#16668](https://github.com/ReliefApplications/oort-backend/issues/16668) ([5cd0ff5](https://github.com/ReliefApplications/emrs-safe-backend/commits/5cd0ff521c660a6e99d8486700da167c1f6ea91c))
* add proper tests for applications query [#16673](https://github.com/ReliefApplications/oort-backend/issues/16673) ([0f96299](https://github.com/ReliefApplications/emrs-safe-backend/commits/0f9629982da2c37f79d8b11d4890d8fe79e76d88))
* can edit position attributes ([b2d95ca](https://github.com/ReliefApplications/emrs-safe-backend/commits/b2d95ca9c95a2ddef8c155de13e566b6c892ce8b))
* set up client authentication for e2e tests ([4b47755](https://github.com/ReliefApplications/emrs-safe-backend/commits/4b47755abdb8985b7772763aa2d30d34c05f0275))
* support sort on text instead of value [#16669](https://github.com/ReliefApplications/oort-backend/issues/16669) ([f18b32f](https://github.com/ReliefApplications/emrs-safe-backend/commits/f18b32f4107e0d4dfff7bd55d43e17a66acebeca))
* update CI to deploy mongodb test database [#16673](https://github.com/ReliefApplications/oort-backend/issues/16673) ([83ac7e4](https://github.com/ReliefApplications/emrs-safe-backend/commits/83ac7e45d96597b0587c588642afab13eec74849))


### Bug Fixes

* .env file creation on ci-dev workflow [#16673](https://github.com/ReliefApplications/oort-backend/issues/16673) ([df9ce22](https://github.com/ReliefApplications/emrs-safe-backend/commits/df9ce229e32a2f4f6f10b1ced8d3fffe32be1d39))
* adapt integration tests to be more precise [#16673](https://github.com/ReliefApplications/oort-backend/issues/16673) ([92ddc83](https://github.com/ReliefApplications/emrs-safe-backend/commits/92ddc830a4b65c5aed70abd235f686714476eef4))
* authentication not working on first request [#16673](https://github.com/ReliefApplications/oort-backend/issues/16673) ([eccdf17](https://github.com/ReliefApplications/emrs-safe-backend/commits/eccdf171ee42e3d6b33f5eb18530b2996674c6ab))
* display=true not working for chilren fields [#16933](https://github.com/ReliefApplications/oort-backend/issues/16933) ([1473a44](https://github.com/ReliefApplications/emrs-safe-backend/commits/1473a44d981cd26da83a47f436f14e3cb53c7028))
* flexible matching between value and choices [#16669](https://github.com/ReliefApplications/oort-backend/issues/16669) ([0916473](https://github.com/ReliefApplications/emrs-safe-backend/commits/091647392c0b97c4791b2b0c81af005c65ffd276))
* issue where modifiedAt would export createAt value ([c4cec2d](https://github.com/ReliefApplications/emrs-safe-backend/commits/c4cec2d39aeeca43ed221ff30b3288810a6c1067))
* issue where other export than records would be brokené [#18423](https://github.com/ReliefApplications/oort-backend/issues/18423) ([c673bbd](https://github.com/ReliefApplications/emrs-safe-backend/commits/c673bbdc8489cc6d3d135ec132447fc81d127bb4))
* move db init and changed tests expectations ([2340fb5](https://github.com/ReliefApplications/emrs-safe-backend/commits/2340fb50916189025884affdc3de1058004526fa))
* now possible to export records if not admin, and permissions of the form are empty [#18826](https://github.com/ReliefApplications/oort-backend/issues/18826) ([6bce1d6](https://github.com/ReliefApplications/emrs-safe-backend/commits/6bce1d6d95113cfef050e16829a1677d7d2e6551))
* split db init with server and connection init [#16673](https://github.com/ReliefApplications/oort-backend/issues/16673) ([0279166](https://github.com/ReliefApplications/emrs-safe-backend/commits/02791660dd9fb2b37f6ffaf5d3d8d47f7f714351))
* try to trigger workflows [#16673](https://github.com/ReliefApplications/oort-backend/issues/16673) ([ecfba91](https://github.com/ReliefApplications/emrs-safe-backend/commits/ecfba912bd89c6a14e451ca51813ea3dc01f4877))
* update applications queries [#16673](https://github.com/ReliefApplications/oort-backend/issues/16673) ([ac000c2](https://github.com/ReliefApplications/emrs-safe-backend/commits/ac000c212173bd33e186764856b6ec35cc1e173b))
* use client.id instead of .env [#16673](https://github.com/ReliefApplications/oort-backend/issues/16673) ([39d0c55](https://github.com/ReliefApplications/emrs-safe-backend/commits/39d0c550d8bff89d258056c23067611b1045cafb))

### [1.1.1](https://github.com/ReliefApplications/emrs-safe-backend/compare/v1.1.1-alpha.0...v1.1.1) (2022-01-12)


### Bug Fixes

* export not working for not admin users [#18826](https://github.com/ReliefApplications/oort-backend/issues/18826) ([a26bdce](https://github.com/ReliefApplications/emrs-safe-backend/commits/a26bdceb9ec949a19eb800f857da3fd218824a07))
* sort by dropdown in choicesByUrl [#16669](https://github.com/ReliefApplications/oort-backend/issues/16669) ([6cf5272](https://github.com/ReliefApplications/emrs-safe-backend/commits/6cf5272d97ac8edd26606aa491f78dfa0dd3a7ac))
* sort desc for arrays [#16669](https://github.com/ReliefApplications/oort-backend/issues/16669) ([5778ba2](https://github.com/ReliefApplications/emrs-safe-backend/commits/5778ba278503d1a62045ffc6e0f37a64aa11f895))

### [1.1.1-alpha.0](https://github.com/ReliefApplications/emrs-safe-backend/compare/v1.1.0...v1.1.1-alpha.0) (2021-12-22)


### Features

* Add display argument at field level [#16944](https://github.com/ReliefApplications/oort-backend/issues/16944) ([a5b8af4](https://github.com/ReliefApplications/emrs-safe-backend/commits/a5b8af41b77954f7116c5516c123ab0d1314cb22))

## [1.1.0](https://github.com/ReliefApplications/emrs-safe-backend/compare/v1.0.0...v1.1.0) (2021-12-09)


### Bug Fixes

* API URL breaking display text with some parameters ([cb8497b](https://github.com/ReliefApplications/emrs-safe-backend/commits/cb8497b17667388a61ff3ed21dd6263458a2da98)), closes [AB#16710](https://github.com/ReliefApplications/AB/issues/16710)
* pass own URL in .env file and catch errors ([18eacad](https://github.com/ReliefApplications/emrs-safe-backend/commits/18eacad4ccb3f4035bb960ad104be55fb3f6b758))
* remove deprecated host ([4eccb42](https://github.com/ReliefApplications/emrs-safe-backend/commits/4eccb421a4fe23c41a46873457ca0524866d20a0))
* set incrementalId on records import from file [#16670](https://github.com/ReliefApplications/oort-backend/issues/16670) ([4516be7](https://github.com/ReliefApplications/emrs-safe-backend/commits/4516be75f5a9cf74b59e2d6edcbc63ddf9a3e9b5))
* support any API URL in getDisplayText [#16710](https://github.com/ReliefApplications/oort-backend/issues/16710) ([48efcf3](https://github.com/ReliefApplications/emrs-safe-backend/commits/48efcf30582ded867999f100eace5e7855936b44))
* update record GQ type tthat was deleting the versions of record [#16302](https://github.com/ReliefApplications/oort-backend/issues/16302) ([d0fe8d6](https://github.com/ReliefApplications/emrs-safe-backend/commits/d0fe8d61c4b434ca2cc4450da1a2127fa570e2b4))

## [1.0.0](https://github.com/ReliefApplications/emrs-safe-backend/compare/v0.1.14-alpha.6...v1.0.0) (2021-12-01)


### Features

* add apollo datasources [#11477](https://github.com/ReliefApplications/oort-backend/issues/11477) ([7465d59](https://github.com/ReliefApplications/emrs-safe-backend/commits/7465d59dcad0b89dc39987faf33d8140e10a863b))
* add display arguments to record queries [#11477](https://github.com/ReliefApplications/oort-backend/issues/11477) ([9c381c1](https://github.com/ReliefApplications/emrs-safe-backend/commits/9c381c1007ca7ec9bf59e97a3bfeb6c30331396d))
* add incremental id [#11375](https://github.com/ReliefApplications/oort-backend/issues/11375) ([afcf4b2](https://github.com/ReliefApplications/emrs-safe-backend/commits/afcf4b2cfba6256fa106c6a81b5e24ed940bc2ef))
* add incrementalId to default fields [#11375](https://github.com/ReliefApplications/oort-backend/issues/11375) ([f5a9f5d](https://github.com/ReliefApplications/emrs-safe-backend/commits/f5a9f5d661a185996efb7574dd33915a862dcd7e))
* adding new question in core form should put it at a better position in children [#11392](https://github.com/ReliefApplications/oort-backend/issues/11392) ([b67fcb2](https://github.com/ReliefApplications/emrs-safe-backend/commits/b67fcb26e947778c827f3405d52f031174546b6d))
* Allow to display text instead of value [#11477](https://github.com/ReliefApplications/oort-backend/issues/11477) ([20e2be1](https://github.com/ReliefApplications/emrs-safe-backend/commits/20e2be18487ebc5b9dabe5826368dec35288b859))
* auto add incrementalId field to record [#11375](https://github.com/ReliefApplications/oort-backend/issues/11375) ([c67a222](https://github.com/ReliefApplications/emrs-safe-backend/commits/c67a2227b44e330d228c50cdd0fabcb0b789fe25))
* Change type of incrementalID to be ID [#11375](https://github.com/ReliefApplications/oort-backend/issues/11375) ([7bb5e46](https://github.com/ReliefApplications/emrs-safe-backend/commits/7bb5e469fe198c0bfc2aa056ac51383c9d1636a5))
* Inherit onCompleteExpression from core form [#11271](https://github.com/ReliefApplications/oort-backend/issues/11271) ([1a7c340](https://github.com/ReliefApplications/emrs-safe-backend/commits/1a7c3405a4aa500e2893c44389f9f83dadd466ef))
* remove unused safeID parameter for apiConfig [#16099](https://github.com/ReliefApplications/oort-backend/issues/16099) ([e23686d](https://github.com/ReliefApplications/emrs-safe-backend/commits/e23686d5017105400fe2e3cd87d524dc3c39f8d0))


### Bug Fixes

* all users displayed when no applications given ([26f9602](https://github.com/ReliefApplications/emrs-safe-backend/commits/26f960206b8f3b245353196c9e6fa5dfbb2e2977))
* bug if applications empty for users question ([c77c252](https://github.com/ReliefApplications/emrs-safe-backend/commits/c77c252cae4b2fcdb74c6f95d2d21ca15151f701))
* issue where comments would insert new fields in the structure of children forms ([502d93b](https://github.com/ReliefApplications/emrs-safe-backend/commits/502d93bbb56e87f3dcdfd2e80e32c2df372f6b94))
* issue where modifiedBy of record would be null if no version ([3166cb1](https://github.com/ReliefApplications/emrs-safe-backend/commits/3166cb1ac1b3d0a3788d90f65452bd4dd4d11f9f))

### [0.1.14-alpha.6](https://github.com/ReliefApplications/emrs-safe-backend/compare/v0.1.14-alpha.5...v0.1.14-alpha.6) (2021-11-08)


### Features

* adapt comment valueName depending on usage [#11322](https://github.com/ReliefApplications/emrs-safe-backend/issues/11322) ([1424737](https://github.com/ReliefApplications/emrs-safe-backend/commits/14247372d72fecc66f229a61b5cef80ae490cbfd))
* can now +/- today date in filtering [#11696](https://github.com/ReliefApplications/emrs-safe-backend/issues/11696) ([b1767d1](https://github.com/ReliefApplications/emrs-safe-backend/commits/b1767d12098b7728972a8dbb1e2dd2f695834094))
* Create field for comment [#11322](https://github.com/ReliefApplications/emrs-safe-backend/issues/11322) ([ec49724](https://github.com/ReliefApplications/emrs-safe-backend/commits/ec4972428a54f29235d1359756469e7980138c9d))
* fill createdBy in PullJob using email match [#11063](https://github.com/ReliefApplications/emrs-safe-backend/issues/11063) ([4b93f40](https://github.com/ReliefApplications/emrs-safe-backend/commits/4b93f4022c3b1d36a2fa0b89306eca1c941c7657))
* optional comment field for some questions [#11322](https://github.com/ReliefApplications/emrs-safe-backend/issues/11322) ([62b1911](https://github.com/ReliefApplications/emrs-safe-backend/commits/62b1911964539da68819cf9472d61d19aff6ba14))
* users as question [#11636](https://github.com/ReliefApplications/emrs-safe-backend/issues/11636) ([9bf490c](https://github.com/ReliefApplications/emrs-safe-backend/commits/9bf490c3af293e6c9ec41194886e29c3d315d0ed))


### Bug Fixes

* correct permissions on records for download [#11772](https://github.com/ReliefApplications/emrs-safe-backend/issues/11772) ([067299e](https://github.com/ReliefApplications/emrs-safe-backend/commits/067299e9991336c24615999532390bcbd02da7ef))
* linting ([e999d0d](https://github.com/ReliefApplications/emrs-safe-backend/commits/e999d0d57f19fbf806d0fe68cd148ead531934d2))
* one to many relationship with multiple definitions of same resource were overlapping [#11374](https://github.com/ReliefApplications/emrs-safe-backend/issues/11374) ([2382bd0](https://github.com/ReliefApplications/emrs-safe-backend/commits/2382bd0ce40e8619f37aea53e789cbb269d94986))

### [0.1.14-alpha.5](https://github.com/ReliefApplications/emrs-safe-backend/compare/v0.1.14-alpha.4...v0.1.14-alpha.5) (2021-10-25)


### Features

* remove pull job link to applications [#10628](https://github.com/ReliefApplications/emrs-safe-backend/issues/10628) ([36919ec](https://github.com/ReliefApplications/emrs-safe-backend/commits/36919ecbce3111575cfcd0fad1780860dc871368))


### Bug Fixes

* prepare commit msg husky hook ([de6d251](https://github.com/ReliefApplications/emrs-safe-backend/commits/de6d2513050ac291b137a9dab6c41d47df10f8aa))
* resource field duplicated instead of replaced ([087bb82](https://github.com/ReliefApplications/emrs-safe-backend/commits/087bb827519efa69f0fca452ac2c91089e486898))
* update non-core resource fields from children ([525a34d](https://github.com/ReliefApplications/emrs-safe-backend/commits/525a34d0394a7e6d5f40e4a845d576d67e4f0fe1))

### [0.1.14-alpha.4](https://github.com/ReliefApplications/emrs-safe-backend/compare/v0.1.14-alpha.3...v0.1.14-alpha.4) (2021-10-19)


### Features

* Adapt pullJob mapping to array identifiers ([bce60eb](https://github.com/ReliefApplications/emrs-safe-backend/commits/bce60eb7aa309c7157effd5c0199ef9238fd20c2))
* Add new permission canCreateApplications ([713007f](https://github.com/ReliefApplications/emrs-safe-backend/commits/713007fc1b1f318a013b1f1c3d5f156e9cd6009f))
* applications permissions for queries ([b92126f](https://github.com/ReliefApplications/emrs-safe-backend/commits/b92126fd1822262e226ce6ce0c1e8e3df1c7c427))
* applications permissions for types ([6d0a3b9](https://github.com/ReliefApplications/emrs-safe-backend/commits/6d0a3b9a198fbd0c055f3ebbb0b33ce7e3a49d8c))
* Apply app permissions on page/step mutations ([2a28e13](https://github.com/ReliefApplications/emrs-safe-backend/commits/2a28e13a1367486b8714c2589f099c17c093cecc))
* check app permissions for dashboard mutation ([fa080c8](https://github.com/ReliefApplications/emrs-safe-backend/commits/fa080c8912b0116a0dbea0b2bb2013894c2d99b0))
* pagination for notifications ([1f42ca5](https://github.com/ReliefApplications/emrs-safe-backend/commits/1f42ca537e8225d040d44417923113df4fc08250))
* Refresh token automatically for proxies ([653587e](https://github.com/ReliefApplications/emrs-safe-backend/commits/653587ed8c4e5fe445a82833fe18ffc5ccd61ca0))
* type resolvers for step ([3ef83d8](https://github.com/ReliefApplications/emrs-safe-backend/commits/3ef83d830e0fc2ee22507a05fb212333ccd46748))
* update resolvers for parent page / step ([e0f2d35](https://github.com/ReliefApplications/emrs-safe-backend/commits/e0f2d35f04d26ac73c76576ba2ec2a459095466c))


### Bug Fixes

* Add await before canAccessContent ([889b2fa](https://github.com/ReliefApplications/emrs-safe-backend/commits/889b2facc9104e22f99fdadd9b93c2984f5e872b))
* add only useful property to stored field ([afe9439](https://github.com/ReliefApplications/emrs-safe-backend/commits/afe94392f59c00a1b56a3491b755f9eff6a73056))
* CanSee pending applications if admin with ([649dd6b](https://github.com/ReliefApplications/emrs-safe-backend/commits/649dd6b9a8814c12472a2a0126472aaa661a40e9))
* Correctly update resource fields on core edit ([4fa7362](https://github.com/ReliefApplications/emrs-safe-backend/commits/4fa7362ca991eb3852023316f8e7e16ccf1d2928))
* issue where non admin filters would not be able to query any record ([ae182ca](https://github.com/ReliefApplications/emrs-safe-backend/commits/ae182ca40fdc530152ca3d0d02517c2190bf2d93))
* linting ([31c2799](https://github.com/ReliefApplications/emrs-safe-backend/commits/31c2799b9fda2ab1715eb75010c0524dc1b5ed2a))
* Linting ([eb6cd81](https://github.com/ReliefApplications/emrs-safe-backend/commits/eb6cd81130bd2a7d6535a96f6ad3b569fbd329ac))
* page permissions display using app rights ([f5598e2](https://github.com/ReliefApplications/emrs-safe-backend/commits/f5598e2794b7ecfc6fa235823abb6601d6284148))
* permissions reflected from application ([70931b4](https://github.com/ReliefApplications/emrs-safe-backend/commits/70931b4b44cc3887f74b0f2d9d739a226341a0d8))
* resources question changes not reflecting ([34076af](https://github.com/ReliefApplications/emrs-safe-backend/commits/34076afc98ff148aa837c2298530881cef8b7c17))
* update last type resolvers ([4776108](https://github.com/ReliefApplications/emrs-safe-backend/commits/477610831ed4c72b18410eee4ea3c3dbd53ed3d7))

### [0.1.14-alpha.3](https://github.com/ReliefApplications/emrs-safe-backend/compare/v0.1.14...v0.1.14-alpha.3) (2021-10-05)

### [0.1.14-alpha.2](https://github.com/ReliefApplications/emrs-safe-backend/compare/v0.1.14-alpha.1...v0.1.14-alpha.2) (2021-09-29)

### [0.1.14-alpha.1](https://github.com/ReliefApplications/emrs-safe-backend/compare/v0.1.14-alpha.0...v0.1.14-alpha.1) (2021-09-22)


### Bug Fixes

* CICD ([349ed3f](https://github.com/ReliefApplications/emrs-safe-backend/commits/349ed3fbc6a87e45201432a93a32804c3e660d5d))

### [0.1.14-alpha.0](https://github.com/ReliefApplications/emrs-safe-backend/compare/v0.1.13...v0.1.14-alpha.0) (2021-09-14)

### [0.1.13](https://github.com/ReliefApplications/emrs-safe-backend/compare/v0.1.13-alpha.0...v0.1.13) (2021-09-14)

### [0.1.13-alpha.0](https://github.com/ReliefApplications/emrs-safe-backend/compare/v0.1.12...v0.1.13-alpha.0) (2021-09-14)

### [0.1.12](https://github.com/ReliefApplications/emrs-safe-backend/compare/v0.1.12-alpha.2...v0.1.12) (2021-09-14)

### [0.1.12-alpha.2](https://github.com/ReliefApplications/emrs-safe-backend/compare/v0.1.12-alpha.1...v0.1.12-alpha.2) (2021-09-14)

### [0.1.12-alpha.1](https://github.com/ReliefApplications/emrs-safe-backend/compare/v0.1.12-alpha.0...v0.1.12-alpha.1) (2021-09-14)

### [0.1.12-alpha.0](https://github.com/ReliefApplications/emrs-safe-backend/compare/v0.1.12-alpha...v0.1.12-alpha.0) (2021-09-14)


### Bug Fixes

* aggregation now working with bson ([65ca98f](https://github.com/ReliefApplications/emrs-safe-backend/commits/65ca98fab275bc3f098d80eb505c24b6c3d11fd0))

### 0.1.12-alpha (2021-08-27)


### Features

* allow different conditions to filter ([bc8e3b7](https://github.com/ReliefApplications/emrs-safe-backend/commits/bc8e3b7de65b0b9076ff1146ddf725bc6a8258bf))


### Bug Fixes

* transform record with deleted fields ([6ad5a2a](https://github.com/ReliefApplications/emrs-safe-backend/commits/6ad5a2ac87f12fcaf8bca461f29f6d3b89f3f605))
