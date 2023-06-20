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
