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
