# [2.1.0-alpha.1](https://github.com/ReliefApplications/oort-backend/compare/v2.0.0...v2.1.0-alpha.1) (2023-07-03)


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

# [2.0.0-alpha.13](https://github.com/ReliefApplications/oort-backend/compare/v2.0.0-alpha.12...v2.0.0-alpha.13) (2023-06-20)


### Bug Fixes

* users could not be invited if no position attributes ([#639](https://github.com/ReliefApplications/oort-backend/issues/639)) ([e570e2f](https://github.com/ReliefApplications/oort-backend/commit/e570e2f8e7d21b3fe2eb31612727fbaa9a19ff41))


### Features

* add dashboard buttons to schema ([fe7bd55](https://github.com/ReliefApplications/oort-backend/commit/fe7bd55de6931364db0c08f90a4c4da143e2d006))

# [2.0.0-alpha.12](https://github.com/ReliefApplications/oort-backend/compare/v2.0.0-alpha.11...v2.0.0-alpha.12) (2023-06-19)


### Bug Fixes

* add calculated fields used in sorting/filtering/style to pipeline ([#618](https://github.com/ReliefApplications/oort-backend/issues/618)) ([79aa6dd](https://github.com/ReliefApplications/oort-backend/commit/79aa6dd390c9f84f14f0d397ed9ee7500074d8fc))
* could not get canUpdate / canDelete on meta ([914575f](https://github.com/ReliefApplications/oort-backend/commit/914575fb663c52fd6ba1f0eae0b4a744c2db6e58))
* could not get canUpdate / canDelete on meta ([323330a](https://github.com/ReliefApplications/oort-backend/commit/323330aec8b9822d85527c8967e935a05738a463))
* could not get correct error from mutations / queries ([48357e5](https://github.com/ReliefApplications/oort-backend/commit/48357e5ec25088a7d72f9a1ffdfe5f11a29b4da9))
* could not update canSee / canUpdate permissions of some fields ([121364b](https://github.com/ReliefApplications/oort-backend/commit/121364b11b8680cdebdc5f9d280c3fe16ea47c8e))
* fields permissions incorrectly being reset ([12379b1](https://github.com/ReliefApplications/oort-backend/commit/12379b141e80887b8b399bee79a58af3e0987343))
* geofiltering would break layers if empty ([c22a882](https://github.com/ReliefApplications/oort-backend/commit/c22a8827f1f8e9b5b554f2b80bba971df8611de6))
* getRows maximum page size ([#617](https://github.com/ReliefApplications/oort-backend/issues/617)) ([0139322](https://github.com/ReliefApplications/oort-backend/commit/0139322d92126184de5756a07c4de33486c01af7))
* hide fields on  roles with no permission ([3de9a25](https://github.com/ReliefApplications/oort-backend/commit/3de9a25a35a9a786338e8e218a6f51c436e591ef))
* inccorect filter in getautoassigned role ([41a0143](https://github.com/ReliefApplications/oort-backend/commit/41a0143723ea06410388490b73a6383630105189))
* incorrect add manage distribution / template permissions migration would create useless permissions ([cfcceae](https://github.com/ReliefApplications/oort-backend/commit/cfcceaed7a2f471c9f35080f9f6e0c4d54bc9755))
* incorrect meta data in graphql ([cfdc06b](https://github.com/ReliefApplications/oort-backend/commit/cfdc06bfb4de27f06992a7bda037e0937932a1ff))
* incorrect name in export batch ([8b09742](https://github.com/ReliefApplications/oort-backend/commit/8b097422554e54d1be2247f4a2216c579cd88d22))
* issue with layers using lat lng fields ([88f75f6](https://github.com/ReliefApplications/oort-backend/commit/88f75f6899c6e0a4da40bee2a7ffc195b2b2d5af))
* jsonpath not being reflected for rest ref data ([0c20fe8](https://github.com/ReliefApplications/oort-backend/commit/0c20fe8693be8bb5dc21895a3580606c49fab2c8))
* permissions not passed to record resolvers ([62313e9](https://github.com/ReliefApplications/oort-backend/commit/62313e91d5bbb1e64f0f355fcc4c496670349ca1))
* prevent any default field to be used in a form ([6e52fda](https://github.com/ReliefApplications/oort-backend/commit/6e52fda5e936d2f95ec18f7a00c5b2cf18023a11))
* prevent pagination to cause payload error ([e488d7e](https://github.com/ReliefApplications/oort-backend/commit/e488d7eabe3e6e5c6d6d5477343be803ac5331f0)), closes [AB#54896](https://github.com/AB/issues/54896) [AB#54896](https://github.com/AB/issues/54896)
* refData from graphQL API ([04c1982](https://github.com/ReliefApplications/oort-backend/commit/04c19823226bee2cd9d0b731860bd89b1d083cd8))
* saving questions from refData ([b19d387](https://github.com/ReliefApplications/oort-backend/commit/b19d387a2fa2a4e13faad260a0f95ad127b6a1a0))
* schema could break due to reference structure not existing ([744e6dd](https://github.com/ReliefApplications/oort-backend/commit/744e6dd8358fad36d5cf4ebe4280b4afc32e63f5))
* update editForm mutation to save field permission as objectIds and not string ([#614](https://github.com/ReliefApplications/oort-backend/issues/614)) ([927f0a1](https://github.com/ReliefApplications/oort-backend/commit/927f0a15c2d98d70197115214dff69fca3accddf))
* update role resource permissions ([cbd8a1b](https://github.com/ReliefApplications/oort-backend/commit/cbd8a1b2724f964a03dfdad1206dd6492f0544b3))


### Features

* add lastUpdateForm meta field ([c1ad0bf](https://github.com/ReliefApplications/oort-backend/commit/c1ad0bf83a6a69792d300a2130de490f4b37987a))
* can now group layers ([074cb2b](https://github.com/ReliefApplications/oort-backend/commit/074cb2b9cb5cdce22e5aadf81e641240a5d77fa6))
* possibility to have pages on top of the app ([e116cbf](https://github.com/ReliefApplications/oort-backend/commit/e116cbf146f612568ac76f4ab62da336a5f218bb))

# [2.0.0-alpha.11](https://github.com/ReliefApplications/oort-backend/compare/v2.0.0-alpha.10...v2.0.0-alpha.11) (2023-05-16)


### Bug Fixes

* problems regarding calculated fields ([0c457eb](https://github.com/ReliefApplications/oort-backend/commit/0c457eb0b94ee3730e96602b0b09e4df2fbec78e))


### Features

* add manage distribution list permission migration ([03b14c0](https://github.com/ReliefApplications/oort-backend/commit/03b14c0f9309596fc7fec79ca14f3b789250250f))
* use column width to generate email table ([a1f9c81](https://github.com/ReliefApplications/oort-backend/commit/a1f9c81c366da1d2586b13910b3015827884e63b))

# [2.0.0-alpha.10](https://github.com/ReliefApplications/oort-backend/compare/v2.0.0-alpha.9...v2.0.0-alpha.10) (2023-05-11)


### Bug Fixes

* gis/feature route was broken due to incorrect layout / aggregation setup ([7a3cdd7](https://github.com/ReliefApplications/oort-backend/commit/7a3cdd70457f59ebca31d13ba36b3ea114c6f518))
