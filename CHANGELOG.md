# [1.4.0-beta.5](https://github.com/ReliefApplications/oort-backend/compare/v1.4.0-beta.4...v1.4.0-beta.5) (2023-01-10)


### Bug Fixes

* aggregation pagination not working ([b6c23cb](https://github.com/ReliefApplications/oort-backend/commit/b6c23cbd7f8f23eeac9eaa8d9134391573a69c2e))
* requests with metadata could cause system failure ([8981dea](https://github.com/ReliefApplications/oort-backend/commit/8981dea9b803c9f018f46398c513a03c00dcb5dd)), closes [1.3.x/AB#53528](https://github.com/1.3.x/AB/issues/53528)
* sorting on multi select field could break records aggregation ([79ac65e](https://github.com/ReliefApplications/oort-backend/commit/79ac65e818b5a4cfc41bf5e3b82b7fd9c20ff3d1))
* transform record would not return correct date / time in some cases ([99c20c5](https://github.com/ReliefApplications/oort-backend/commit/99c20c58c8df9192f7aa7351fd95b5c5db69aa72))
* validation on a form using choicesByUrl could send 401 errors due to missing token ([0fb643e](https://github.com/ReliefApplications/oort-backend/commit/0fb643e78287c38b664737a58190968a0eddf216))

## [1.3.6](https://github.com/ReliefApplications/oort-backend/compare/v1.3.5...v1.3.6) (2023-01-10)


### Bug Fixes

* aggregation pagination not working ([b6c23cb](https://github.com/ReliefApplications/oort-backend/commit/b6c23cbd7f8f23eeac9eaa8d9134391573a69c2e))
* requests with metadata could cause system failure ([8981dea](https://github.com/ReliefApplications/oort-backend/commit/8981dea9b803c9f018f46398c513a03c00dcb5dd)), closes [1.3.x/AB#53528](https://github.com/1.3.x/AB/issues/53528)
* validation on a form using choicesByUrl could send 401 errors due to missing token ([0fb643e](https://github.com/ReliefApplications/oort-backend/commit/0fb643e78287c38b664737a58190968a0eddf216))

# [1.4.0-beta.4](https://github.com/ReliefApplications/oort-backend/compare/v1.4.0-beta.3...v1.4.0-beta.4) (2023-01-04)


### Bug Fixes

* file question type now supported in record history ([eb53df8](https://github.com/ReliefApplications/oort-backend/commit/eb53df84e6edd2c2b60ece813b2c7dc4f67533e0)), closes [AB#52075](https://github.com/AB/issues/52075)
* infinite loop when getting form / resource metadata, due to relationship between resources ([1cbc6b1](https://github.com/ReliefApplications/oort-backend/commit/1cbc6b1b5fa6bcde30a43e840500d8b42bc08556))
* user could see 'add' button on grids, even if not authorized ([62d07be](https://github.com/ReliefApplications/oort-backend/commit/62d07bec9453f81b6460dfa04a332f2e37bad675))


## [1.3.5](https://github.com/ReliefApplications/oort-backend/compare/v1.3.4...v1.3.5) (2023-01-04)


### Bug Fixes

* sorting on multi select field could break records aggregation ([79ac65e](https://github.com/ReliefApplications/oort-backend/commit/79ac65e818b5a4cfc41bf5e3b82b7fd9c20ff3d1))

## [1.3.4](https://github.com/ReliefApplications/oort-backend/compare/v1.3.3...v1.3.4) (2023-01-03)


### Bug Fixes

* file question type now supported in record history ([eb53df8](https://github.com/ReliefApplications/oort-backend/commit/eb53df84e6edd2c2b60ece813b2c7dc4f67533e0)), closes [AB#52075](https://github.com/AB/issues/52075)
* infinite loop when getting form / resource metadata, due to relationship between resources ([1cbc6b1](https://github.com/ReliefApplications/oort-backend/commit/1cbc6b1b5fa6bcde30a43e840500d8b42bc08556))
* user could see 'add' button on grids, even if not authorized ([62d07be](https://github.com/ReliefApplications/oort-backend/commit/62d07bec9453f81b6460dfa04a332f2e37bad675))

# [1.4.0-beta.3](https://github.com/ReliefApplications/oort-backend/compare/v1.4.0-beta.2...v1.4.0-beta.3) (2022-12-20)


### Bug Fixes

* add custom surveyjs components in the back so validation can detect them ([3795674](https://github.com/ReliefApplications/oort-backend/commit/37956747cfecde8510be9ddc0c8f253bb61ba830))
* could edit attributes if not local config ([0e247aa](https://github.com/ReliefApplications/oort-backend/commit/0e247aa8de0d70c4364fb6f5eb4d9ed3fa1be2aa))
* could not get choices in metadata helper if token was not passed ([e816438](https://github.com/ReliefApplications/oort-backend/commit/e816438e9572f91e2d61e35c0c371caa2fee4148))
* filter on resource type question ([d1ddf39](https://github.com/ReliefApplications/oort-backend/commit/d1ddf39a2403ba1193694de5c81908ff8038579f))
* reference data could not be edited if only one updated field ([7d33f67](https://github.com/ReliefApplications/oort-backend/commit/7d33f676489b9ae224729201d99ef7dc8765cb1e))
* remove class declaration true in tsconfig ([46f3ca1](https://github.com/ReliefApplications/oort-backend/commit/46f3ca1094b5e8d436e4f3afaf7fe24030018cc3))
* send meta of related question ([908afef](https://github.com/ReliefApplications/oort-backend/commit/908afefaf142fc2f5932f051dca99c97064e11ed))

# [1.4.0-beta.2](https://github.com/ReliefApplications/oort-backend/compare/v1.4.0-beta.1...v1.4.0-beta.2) (2022-12-08)


### Bug Fixes

* using user._id would cause some issues with user management methods ([cee82ef](https://github.com/ReliefApplications/oort-backend/commit/cee82efa964fe029e2b3669cd011e8733605702e))

# [1.4.0-beta.1](https://github.com/ReliefApplications/oort-backend/compare/v1.3.0...v1.4.0-beta.1) (2022-12-01)


### Bug Fixes

* can now properly use the columns for styling ([7676364](https://github.com/ReliefApplications/oort-backend/commit/7676364bcb4531c9bf459dec78dd3153fb5134b7))
* converting concat operators into string ([fdd96ae](https://github.com/ReliefApplications/oort-backend/commit/fdd96aeed0902af177562c36d1f4a2db42a112cf))
* lint ([c3f7f19](https://github.com/ReliefApplications/oort-backend/commit/c3f7f191f59a51ca3e56444dece30490eb9fffed))
* removed old resource model changes ([ac4f30a](https://github.com/ReliefApplications/oort-backend/commit/ac4f30aa11a393758ecea11eab0ab4e63ebf946b))
* sort and filter by calculated cols ([9672968](https://github.com/ReliefApplications/oort-backend/commit/9672968dea7f21904336256497040155d511df78))
* updating type on update ([7619e14](https://github.com/ReliefApplications/oort-backend/commit/7619e146b96a254af5cfea2b9a6e1bfde83a9bbc))


### Features

* add calcfields stages to aggr pipeline ([8aa158a](https://github.com/ReliefApplications/oort-backend/commit/8aa158ac460585f3d58fa113ab2b861ad295d3b8))
* added date expression ([8d64b25](https://github.com/ReliefApplications/oort-backend/commit/8d64b259f72affb44a8abe96e1e31aacb504023c))
* added special info operators ([977bc4a](https://github.com/ReliefApplications/oort-backend/commit/977bc4a9e80194a0d9b7ccc803a8eff45ef8e59f))
* added today operation + bit of refactoring ([ea5554d](https://github.com/ReliefApplications/oort-backend/commit/ea5554dd3468aff4a8b12ab9fa3b43d3e91b04ea))
* adding derivedFields on custom query ([d003b6f](https://github.com/ReliefApplications/oort-backend/commit/d003b6fd52871c897758d694bfd3035a794c1e59))
* building pipeline for single and double also ([63299ff](https://github.com/ReliefApplications/oort-backend/commit/63299ffe95f7feb9da4cb57390c0953c43542283))
* grouping by null in aggregations ([41a7b9b](https://github.com/ReliefApplications/oort-backend/commit/41a7b9b3cf4f6c5d5f00e95b800b6fef17e3cdec))
* pipeline builder for multiple operators case ([b340f9a](https://github.com/ReliefApplications/oort-backend/commit/b340f9a8af2e567611593e5e32e9265a139f7859))
* updated editResource mutation ([6337871](https://github.com/ReliefApplications/oort-backend/commit/6337871aa0c97f6d154a0e40b9e52f90fcd19a66))


## [1.3.3](https://github.com/ReliefApplications/oort-backend/compare/v1.3.2...v1.3.3) (2022-12-19)


### Bug Fixes

* remove class declaration true in tsconfig ([46f3ca1](https://github.com/ReliefApplications/oort-backend/commit/46f3ca1094b5e8d436e4f3afaf7fe24030018cc3))

## [1.3.2](https://github.com/ReliefApplications/oort-backend/compare/v1.3.1...v1.3.2) (2022-12-19)


### Bug Fixes

* add custom surveyjs components in the back so validation can detect them ([3795674](https://github.com/ReliefApplications/oort-backend/commit/37956747cfecde8510be9ddc0c8f253bb61ba830))
* could edit attributes if not local config ([0e247aa](https://github.com/ReliefApplications/oort-backend/commit/0e247aa8de0d70c4364fb6f5eb4d9ed3fa1be2aa))
* could not get choices in metadata helper if token was not passed ([e816438](https://github.com/ReliefApplications/oort-backend/commit/e816438e9572f91e2d61e35c0c371caa2fee4148))
* filter on resource type question ([d1ddf39](https://github.com/ReliefApplications/oort-backend/commit/d1ddf39a2403ba1193694de5c81908ff8038579f))
* reference data could not be edited if only one updated field ([7d33f67](https://github.com/ReliefApplications/oort-backend/commit/7d33f676489b9ae224729201d99ef7dc8765cb1e))
* send meta of related question ([908afef](https://github.com/ReliefApplications/oort-backend/commit/908afefaf142fc2f5932f051dca99c97064e11ed))


## [1.3.1](https://github.com/ReliefApplications/oort-backend/compare/v1.3.0...v1.3.1) (2022-12-07)


### Bug Fixes

* using user._id would cause some issues with user management methods ([cee82ef](https://github.com/ReliefApplications/oort-backend/commit/cee82efa964fe029e2b3669cd011e8733605702e))

# [1.3.0](https://github.com/ReliefApplications/oort-backend/compare/v1.2.0...v1.3.0) (2022-12-01)


### Bug Fixes

* adds checks to prevent mongo errors ([a8d9f35](https://github.com/ReliefApplications/oort-backend/commit/a8d9f35b8d9e11e85a4c2886377c9e6a0b3b2758))
* aggregation name edition ([538c731](https://github.com/ReliefApplications/oort-backend/commit/538c731d9abac1e6e443342eeae3c194fa375a1c))
* allow to sort while filtering for all types Refactor the all.ts query and manage to handle all the cases for sorting ([e67a8eb](https://github.com/ReliefApplications/oort-backend/commit/e67a8ebad00300ceecd4cf33ed59f2d6fc2346cc))
* bug with aggregation mapping [#37424](https://github.com/ReliefApplications/oort-backend/issues/37424) ([e30bb9f](https://github.com/ReliefApplications/oort-backend/commit/e30bb9fee03a74c630cdfa50839e84a86373202a))
* bug with attachment empty [#25833](https://github.com/ReliefApplications/oort-backend/issues/25833) ([a6cca3a](https://github.com/ReliefApplications/oort-backend/commit/a6cca3ae590e5afc4f381d2be5f7de33336f499a))
* bug with static refData resolvers [#37424](https://github.com/ReliefApplications/oort-backend/issues/37424) ([1b7d6ae](https://github.com/ReliefApplications/oort-backend/commit/1b7d6ae41c3d6f28378dd8a4fef24eca39baa2bd))
* cannot see records with createdBy.user = null ([41cffb3](https://github.com/ReliefApplications/oort-backend/commit/41cffb3c53d85cbe7792745380d34a4e3b3cfefe))
* canUpdate and canDelete optimization ([216b423](https://github.com/ReliefApplications/oort-backend/commit/216b42387e9c0a66d27ea624f0ba33f3d08df411))
* canUpdate and canDelete problems with admin ([1c94c1d](https://github.com/ReliefApplications/oort-backend/commit/1c94c1dd159d688441033396c1b464dc1508a82b))
* converting id to string in order to filter ([70fa69b](https://github.com/ReliefApplications/oort-backend/commit/70fa69bcf1d871ce01a2dc4dd7667a6ff842bfbd))
* fixed caching issue ([500dba9](https://github.com/ReliefApplications/oort-backend/commit/500dba9fc7fcfa08f34e2d1b61bf659668878883))
* fixed record edition mutation [#29961](https://github.com/ReliefApplications/oort-backend/issues/29961) ([55bbaf9](https://github.com/ReliefApplications/oort-backend/commit/55bbaf98a7b3faef14930724e3a76b1d73d512d9))
* force DataSource responses to be JSON ([8ed7d5e](https://github.com/ReliefApplications/oort-backend/commit/8ed7d5e6396e134d58a44cd8df9e0930bbf62154))
* forgot to save file [#10639](https://github.com/ReliefApplications/oort-backend/issues/10639) ([9738707](https://github.com/ReliefApplications/oort-backend/commit/9738707d54b52947aaea8a46b34acc7ec4723734))
* history of records with reference data [#39364](https://github.com/ReliefApplications/oort-backend/issues/39364) ([62546aa](https://github.com/ReliefApplications/oort-backend/commit/62546aa12e9ae51ffff8693eed12c6d2f418a181))
* issue when extracting filter fields ([f8bad8b](https://github.com/ReliefApplications/oort-backend/commit/f8bad8b912f9ff9a892e3a5e9c28c48cc3f03342))
* linting [#39364](https://github.com/ReliefApplications/oort-backend/issues/39364) ([edfb79c](https://github.com/ReliefApplications/oort-backend/commit/edfb79c344d1c2f90ec6594224acd84e791b1e85))
* minor fixes ([2d5bb36](https://github.com/ReliefApplications/oort-backend/commit/2d5bb36ee6b3ac728d9ab6ee7bdc1b00bba7e6fe))
* problems with recordsPermissions on createdBy ([afee65c](https://github.com/ReliefApplications/oort-backend/commit/afee65c4ce704fed4bdd89f07a3c3c4408ef461b))
* query empty for simple forms ([d00819c](https://github.com/ReliefApplications/oort-backend/commit/d00819c23d5c0dfb666ea02015557d0698b1902f))
* remove copy paste artifacts [#10639](https://github.com/ReliefApplications/oort-backend/issues/10639) ([01da235](https://github.com/ReliefApplications/oort-backend/commit/01da2355c90b9b66605b43e0c2146d07b778e3f0))
* remove unused import ([4865b18](https://github.com/ReliefApplications/oort-backend/commit/4865b182b91b8e9cb1d8b9d94bd46e51c34a9413))
* removed autotoggle field permission from form [#29961](https://github.com/ReliefApplications/oort-backend/issues/29961) ([6ac9579](https://github.com/ReliefApplications/oort-backend/commit/6ac95799f058c5d50976b7b69211f4e0494056ee))
* removed log [#29961](https://github.com/ReliefApplications/oort-backend/issues/29961) ([7af4480](https://github.com/ReliefApplications/oort-backend/commit/7af44808eac7a01035de029bf030b6d3c9aca0ff))
* removed log + fixed record query [#29961](https://github.com/ReliefApplications/oort-backend/issues/29961) ([4274b3f](https://github.com/ReliefApplications/oort-backend/commit/4274b3f0aa6de87ba71be0ec833416ec1bdff54a))
* schema breaks if related resource nout found ([d221d35](https://github.com/ReliefApplications/oort-backend/commit/d221d3513a75c71252c377c5c509df08b5af960f))
* setting typos [#29935](https://github.com/ReliefApplications/oort-backend/issues/29935) ([3b1fdc2](https://github.com/ReliefApplications/oort-backend/commit/3b1fdc2b68edbbe694dbd599d452df206282ff4b))
* special characters removed from the destination file name. fix download history by removing history call in history definition ([928b807](https://github.com/ReliefApplications/oort-backend/commit/928b807e3f74410f189246b00a450dcf8f90443f))
* transforming user into json ([7fe5f19](https://github.com/ReliefApplications/oort-backend/commit/7fe5f193781b4824b853565d465a932741a52464))


### Features

* add modifiedAt field to referenceData [#29451](https://github.com/ReliefApplications/oort-backend/issues/29451) ([69d8b42](https://github.com/ReliefApplications/oort-backend/commit/69d8b42d12beb0ecb393bf339840b85a42d4121c))
* Add new express-winston logger system to catch http requests. Add color in log files ([86a57fc](https://github.com/ReliefApplications/oort-backend/commit/86a57fce3e630a45c6b39859146c3a315bb294e3))
* add nodemailer to send email from the back [#25833](https://github.com/ReliefApplications/oort-backend/issues/25833) ([d46f2a8](https://github.com/ReliefApplications/oort-backend/commit/d46f2a8daffa4c75de36cfe6f3f2068819f490df))
* add possibility to filter form / resource records query by linked resources ([f029e7d](https://github.com/ReliefApplications/oort-backend/commit/f029e7d3d9e9af1fd4e897bbf242aec51f0ee1c7))
* add ReferenceData model and its integration [#10639](https://github.com/ReliefApplications/oort-backend/issues/10639) ([443ba17](https://github.com/ReliefApplications/oort-backend/commit/443ba17830ebd2918f8436050b2df38f1c029952))
* added case for attributes in the filters ([ab41b20](https://github.com/ReliefApplications/oort-backend/commit/ab41b2073f3186a5d5f3b9ea6277a4d3af64a650))
* added field permissions to forms as well [#29961](https://github.com/ReliefApplications/oort-backend/issues/29961) ([473e57e](https://github.com/ReliefApplications/oort-backend/commit/473e57e34e9de5283570b2256b23009341fb7633))
* added pagination to aggregations ([ae8e3e5](https://github.com/ReliefApplications/oort-backend/commit/ae8e3e53953604eeb4d2cbeec2f8657ab9310350))
* auto assignment of rules from groups ([2147519](https://github.com/ReliefApplications/oort-backend/commit/21475195d1082fc58d90bb74509b31ea374f4b2d))
* can duplicate pages [#27084](https://github.com/ReliefApplications/oort-backend/issues/27084) ([d0bd649](https://github.com/ReliefApplications/oort-backend/commit/d0bd649eb99d7ce5a5f29bc10ebc9e0c8b92109a))
* fetch user attributes from external API [#29935](https://github.com/ReliefApplications/oort-backend/issues/29935) ([e86db9e](https://github.com/ReliefApplications/oort-backend/commit/e86db9ec0e36439589b4a8e0c299025e02d5186a))
* new graphql filter field for refData [#29451](https://github.com/ReliefApplications/oort-backend/issues/29451) ([adaecad](https://github.com/ReliefApplications/oort-backend/commit/adaecadba2778df44181f44e26fcadee57dbb4e8))
* page size now part of layout ([bc88bde](https://github.com/ReliefApplications/oort-backend/commit/bc88bdead17c3ed5eedb4693f86d4e2fa31d5301))
* pagination for layouts field on resource ([ae033ca](https://github.com/ReliefApplications/oort-backend/commit/ae033caa939326cad7224a23378d48289ee2c07a))
* replace all console.log and console.error by new logger system ([1f84702](https://github.com/ReliefApplications/oort-backend/commit/1f84702d2952430ca794dcfb719dc5f5c1a457ab))
* same structure for unicity as other permissions ([84eb85d](https://github.com/ReliefApplications/oort-backend/commit/84eb85d72b0cdc915ec42f3500487d5e934b3a4a))
* sending only accessible fields on from query [#29961](https://github.com/ReliefApplications/oort-backend/issues/29961) ([d0f2037](https://github.com/ReliefApplications/oort-backend/commit/d0f203762ea222d20ea75a2d1dbd727dc725a50f))
* sending user access on queries/meta [#29961](https://github.com/ReliefApplications/oort-backend/issues/29961) ([d4e290e](https://github.com/ReliefApplications/oort-backend/commit/d4e290e77940138f7484d990509a3ed3e0e06513))
* sort applications on FO by modifiedAt ([d909537](https://github.com/ReliefApplications/oort-backend/commit/d909537f7667156eef357e7887a8e9d0f3743cda))
* support aggregations with referenceDatas [#37424](https://github.com/ReliefApplications/oort-backend/issues/37424) ([dafc13c](https://github.com/ReliefApplications/oort-backend/commit/dafc13cc99e34a87c86981967a9a4f3f4d8171db))
* support sort and filter for refData fields ([29e6a91](https://github.com/ReliefApplications/oort-backend/commit/29e6a915fded9fd131e74b95d40822e0e9328d5b))
* toggling resource filed permission [#29961](https://github.com/ReliefApplications/oort-backend/issues/29961) ([6386147](https://github.com/ReliefApplications/oort-backend/commit/63861470a74aa9a33c7f00934800530dbdf51927))
* using attributes for auto roles filter ([a693f0b](https://github.com/ReliefApplications/oort-backend/commit/a693f0b875820c46526a983d9a9daff3ed74eef4))

# [1.2.0](https://github.com/ReliefApplications/oort-backend/compare/v1.1.0...v1.2.0) (2022-12-01)


### Features

* 1.2 ([a7bf80d](https://github.com/ReliefApplications/oort-backend/commit/a7bf80d513212fe668a8debb598907835c1a6686))

# [1.1.0](https://github.com/ReliefApplications/oort-backend/compare/v1.0.0...v1.1.0) (2022-12-01)


### Features

* 1.1 ([90b50d2](https://github.com/ReliefApplications/oort-backend/commit/90b50d2d1a13df954a668424ffa36ed6100f6853))

# 1.0.0 (2022-12-01)


### Bug Fixes

* .env file creation on ci-dev workflow [#16673](https://github.com/ReliefApplications/oort-backend/issues/16673) ([df9ce22](https://github.com/ReliefApplications/oort-backend/commit/df9ce229e32a2f4f6f10b1ced8d3fffe32be1d39))
* adapt integration tests to be more precise [#16673](https://github.com/ReliefApplications/oort-backend/issues/16673) ([92ddc83](https://github.com/ReliefApplications/oort-backend/commit/92ddc830a4b65c5aed70abd235f686714476eef4))
* add core to retrieve core form ([faeab92](https://github.com/ReliefApplications/oort-backend/commit/faeab92552102b613ce13a7b930510ac53431090))
* add other choice for choicesByUrl question ([349092a](https://github.com/ReliefApplications/oort-backend/commit/349092ac2606faddbefc051a8ef9d49eb8f788b2))
* aggregation now working with bson ([65ca98f](https://github.com/ReliefApplications/oort-backend/commit/65ca98fab275bc3f098d80eb505c24b6c3d11fd0))
* all users displayed when no applications given ([26f9602](https://github.com/ReliefApplications/oort-backend/commit/26f960206b8f3b245353196c9e6fa5dfbb2e2977))
* API URL breaking display text with some parameters ([cb8497b](https://github.com/ReliefApplications/oort-backend/commit/cb8497b17667388a61ff3ed21dd6263458a2da98)), closes [AB#16710](https://github.com/AB/issues/16710)
* authentication not working on first request [#16673](https://github.com/ReliefApplications/oort-backend/issues/16673) ([eccdf17](https://github.com/ReliefApplications/oort-backend/commit/eccdf171ee42e3d6b33f5eb18530b2996674c6ab))
* bug if applications empty for users question ([c77c252](https://github.com/ReliefApplications/oort-backend/commit/c77c252cae4b2fcdb74c6f95d2d21ca15151f701))
* cannot see records with createdBy.user = null [#33755](https://github.com/ReliefApplications/oort-backend/issues/33755) ([05c080e](https://github.com/ReliefApplications/oort-backend/commit/05c080e0c015cf9e9e26b538491fc759efc78397))
* CICD ([349ed3f](https://github.com/ReliefApplications/oort-backend/commit/349ed3fbc6a87e45201432a93a32804c3e660d5d))
* correct permissions on records for download [#11772](https://github.com/ReliefApplications/oort-backend/issues/11772) ([067299e](https://github.com/ReliefApplications/oort-backend/commit/067299e9991336c24615999532390bcbd02da7ef))
* crash when proxy req is interrupted by client ([47bc4fd](https://github.com/ReliefApplications/oort-backend/commit/47bc4fd96f43bcb8762c268fec59820d9667d4c7))
* display=true not working for chilren fields [#16933](https://github.com/ReliefApplications/oort-backend/issues/16933) ([1473a44](https://github.com/ReliefApplications/oort-backend/commit/1473a44d981cd26da83a47f436f14e3cb53c7028))
* export JSON for matrix type questions ([cbbbe08](https://github.com/ReliefApplications/oort-backend/commit/cbbbe08ec89191144bfdd3ecb600f88d7ed36576))
* export not working for not admin users [#18826](https://github.com/ReliefApplications/oort-backend/issues/18826) ([a26bdce](https://github.com/ReliefApplications/oort-backend/commit/a26bdceb9ec949a19eb800f857da3fd218824a07))
* filter stage with dates [#24829](https://github.com/ReliefApplications/oort-backend/issues/24829) ([75a45cf](https://github.com/ReliefApplications/oort-backend/commit/75a45cfe56b5a8534e17cfd72c70435d652f19c3))
* first auth and put credentials in .env ([12fe065](https://github.com/ReliefApplications/oort-backend/commit/12fe0659e1f085e162e6517db624801e6efc3453))
* flexible matching between value and choices [#16669](https://github.com/ReliefApplications/oort-backend/issues/16669) ([0916473](https://github.com/ReliefApplications/oort-backend/commit/091647392c0b97c4791b2b0c81af005c65ffd276))
* issue where comments would insert new fields in the structure of children forms ([502d93b](https://github.com/ReliefApplications/oort-backend/commit/502d93bbb56e87f3dcdfd2e80e32c2df372f6b94))
* issue where modifiedAt would export createAt value ([c4cec2d](https://github.com/ReliefApplications/oort-backend/commit/c4cec2d39aeeca43ed221ff30b3288810a6c1067))
* issue where modifiedBy of record would be null if no version ([3166cb1](https://github.com/ReliefApplications/oort-backend/commit/3166cb1ac1b3d0a3788d90f65452bd4dd4d11f9f))
* issue where non admin filters would not be able to query any record ([ae182ca](https://github.com/ReliefApplications/oort-backend/commit/ae182ca40fdc530152ca3d0d02517c2190bf2d93))
* issue where other export than records would be brokené [#18423](https://github.com/ReliefApplications/oort-backend/issues/18423) ([c673bbd](https://github.com/ReliefApplications/oort-backend/commit/c673bbdc8489cc6d3d135ec132447fc81d127bb4))
* issue where style would not apply to some items, depending on pagination [#28131](https://github.com/ReliefApplications/oort-backend/issues/28131) ([c175794](https://github.com/ReliefApplications/oort-backend/commit/c175794c0efd11e946351b506ff51682340f5c26))
* lint [#28131](https://github.com/ReliefApplications/oort-backend/issues/28131) ([1004a87](https://github.com/ReliefApplications/oort-backend/commit/1004a87e811955aa63bf837955dfe4009b452093))
* move db init and changed tests expectations ([2340fb5](https://github.com/ReliefApplications/oort-backend/commit/2340fb50916189025884affdc3de1058004526fa))
* now possible to export records if not admin, and permissions of the form are empty [#18826](https://github.com/ReliefApplications/oort-backend/issues/18826) ([6bce1d6](https://github.com/ReliefApplications/oort-backend/commit/6bce1d6d95113cfef050e16829a1677d7d2e6551))
* one to many relationship with multiple definitions of same resource were overlapping [#11374](https://github.com/ReliefApplications/oort-backend/issues/11374) ([2382bd0](https://github.com/ReliefApplications/oort-backend/commit/2382bd0ce40e8619f37aea53e789cbb269d94986))
* pass display argument to related fields [#22026](https://github.com/ReliefApplications/oort-backend/issues/22026) ([abe67b9](https://github.com/ReliefApplications/oort-backend/commit/abe67b9a4f2a54d0a4d7ca7e2e59c2b957810bb9))
* pass own URL in .env file and catch errors ([18eacad](https://github.com/ReliefApplications/oort-backend/commit/18eacad4ccb3f4035bb960ad104be55fb3f6b758))
* permission logic ([a37c386](https://github.com/ReliefApplications/oort-backend/commit/a37c38602ab74896f993d11c5d04eee3d8aa4e6d))
* permissions on records for resource ([3385735](https://github.com/ReliefApplications/oort-backend/commit/3385735048b1883a43f4365a0faece4d1d4c9799))
* prepare commit msg husky hook ([de6d251](https://github.com/ReliefApplications/oort-backend/commit/de6d2513050ac291b137a9dab6c41d47df10f8aa))
* prevents sending duplicate choice values [#33768](https://github.com/ReliefApplications/oort-backend/issues/33768) ([7365f70](https://github.com/ReliefApplications/oort-backend/commit/7365f7095af69898c365940e8b63cc867a858345))
* pullJob with same linked fields mapped twice [#26822](https://github.com/ReliefApplications/oort-backend/issues/26822) ([241a19c](https://github.com/ReliefApplications/oort-backend/commit/241a19c35cfb19318f1216b6898d4f1828fb0e26))
* recursive unwind for embedded fields [#24829](https://github.com/ReliefApplications/oort-backend/issues/24829) ([d012424](https://github.com/ReliefApplications/oort-backend/commit/d0124240f5345ff2445f6b907b5be6b676e0f4ab))
* remove deprecated host ([4eccb42](https://github.com/ReliefApplications/oort-backend/commit/4eccb421a4fe23c41a46873457ca0524866d20a0))
* set incrementalId on records import from file [#16670](https://github.com/ReliefApplications/oort-backend/issues/16670) ([4516be7](https://github.com/ReliefApplications/oort-backend/commit/4516be75f5a9cf74b59e2d6edcbc63ddf9a3e9b5))
* sort by dropdown in choicesByUrl [#16669](https://github.com/ReliefApplications/oort-backend/issues/16669) ([6cf5272](https://github.com/ReliefApplications/oort-backend/commit/6cf5272d97ac8edd26606aa491f78dfa0dd3a7ac))
* sort desc for arrays [#16669](https://github.com/ReliefApplications/oort-backend/issues/16669) ([5778ba2](https://github.com/ReliefApplications/oort-backend/commit/5778ba278503d1a62045ffc6e0f37a64aa11f895))
* split db init with server and connection init [#16673](https://github.com/ReliefApplications/oort-backend/issues/16673) ([0279166](https://github.com/ReliefApplications/oort-backend/commit/02791660dd9fb2b37f6ffaf5d3d8d47f7f714351))
* stringify _id for groupBy stage ([67c4096](https://github.com/ReliefApplications/oort-backend/commit/67c40967e9547df5192eda26329da9763c9f77b3))
* support any API URL in getDisplayText [#16710](https://github.com/ReliefApplications/oort-backend/issues/16710) ([48efcf3](https://github.com/ReliefApplications/oort-backend/commit/48efcf30582ded867999f100eace5e7855936b44))
* transform record with deleted fields ([6ad5a2a](https://github.com/ReliefApplications/oort-backend/commit/6ad5a2ac87f12fcaf8bca461f29f6d3b89f3f605))
* try to trigger workflows [#16673](https://github.com/ReliefApplications/oort-backend/issues/16673) ([ecfba91](https://github.com/ReliefApplications/oort-backend/commit/ecfba912bd89c6a14e451ca51813ea3dc01f4877))
* update applications queries [#16673](https://github.com/ReliefApplications/oort-backend/issues/16673) ([ac000c2](https://github.com/ReliefApplications/oort-backend/commit/ac000c212173bd33e186764856b6ec35cc1e173b))
* update record GQ type tthat was deleting the versions of record [#16302](https://github.com/ReliefApplications/oort-backend/issues/16302) ([d0fe8d6](https://github.com/ReliefApplications/oort-backend/commit/d0fe8d61c4b434ca2cc4450da1a2127fa570e2b4))
* use client.id instead of .env [#16673](https://github.com/ReliefApplications/oort-backend/issues/16673) ([39d0c55](https://github.com/ReliefApplications/oort-backend/commit/39d0c550d8bff89d258056c23067611b1045cafb))


### Features

* add apollo datasources [#11477](https://github.com/ReliefApplications/oort-backend/issues/11477) ([7465d59](https://github.com/ReliefApplications/oort-backend/commit/7465d59dcad0b89dc39987faf33d8140e10a863b))
* add custom aggregation [#24823](https://github.com/ReliefApplications/oort-backend/issues/24823) ([ddc0ae3](https://github.com/ReliefApplications/oort-backend/commit/ddc0ae3a037f6e6f270ca2c0d67f4d6982dc1abd))
* Add display argument at field level [#16944](https://github.com/ReliefApplications/oort-backend/issues/16944) ([a5b8af4](https://github.com/ReliefApplications/oort-backend/commit/a5b8af41b77954f7116c5516c123ab0d1314cb22))
* add display arguments to record queries [#11477](https://github.com/ReliefApplications/oort-backend/issues/11477) ([9c381c1](https://github.com/ReliefApplications/oort-backend/commit/9c381c1007ca7ec9bf59e97a3bfeb6c30331396d))
* add incremental id [#11375](https://github.com/ReliefApplications/oort-backend/issues/11375) ([afcf4b2](https://github.com/ReliefApplications/oort-backend/commit/afcf4b2cfba6256fa106c6a81b5e24ed940bc2ef))
* add incrementalId to default fields [#11375](https://github.com/ReliefApplications/oort-backend/issues/11375) ([f5a9f5d](https://github.com/ReliefApplications/oort-backend/commit/f5a9f5d661a185996efb7574dd33915a862dcd7e))
* add limit to records of type List in query response thanks to sortFirst ([6cf0441](https://github.com/ReliefApplications/oort-backend/commit/6cf04412ebb0017ea24a1183caaa467f0b05c9d9))
* add other choice support [#16668](https://github.com/ReliefApplications/oort-backend/issues/16668) ([5cd0ff5](https://github.com/ReliefApplications/oort-backend/commit/5cd0ff521c660a6e99d8486700da167c1f6ea91c))
* add proper tests for applications query [#16673](https://github.com/ReliefApplications/oort-backend/issues/16673) ([0f96299](https://github.com/ReliefApplications/oort-backend/commit/0f9629982da2c37f79d8b11d4890d8fe79e76d88))
* add query name to resource / form types ([c57e6a2](https://github.com/ReliefApplications/oort-backend/commit/c57e6a22f2cb398ea404e8c16aa52a7629ab469a))
* add unwind stage [#24823](https://github.com/ReliefApplications/oort-backend/issues/24823) ([7d96170](https://github.com/ReliefApplications/oort-backend/commit/7d9617048e13bb83817d18c9ffa0f3a9984e9055))
* added can_manage_templates permisson ([0f1a923](https://github.com/ReliefApplications/oort-backend/commit/0f1a923c67f689e75ceaf479b307bf6ad09fb9d6))
* added templates to application ([48519f1](https://github.com/ReliefApplications/oort-backend/commit/48519f18212f125a38ef4b06bad08a038a550dc5))
* adding new question in core form should put it at a better position in children [#11392](https://github.com/ReliefApplications/oort-backend/issues/11392) ([b67fcb2](https://github.com/ReliefApplications/oort-backend/commit/b67fcb26e947778c827f3405d52f031174546b6d))
* allow different conditions to filter ([bc8e3b7](https://github.com/ReliefApplications/oort-backend/commit/bc8e3b7de65b0b9076ff1146ddf725bc6a8258bf))
* Allow to display text instead of value [#11477](https://github.com/ReliefApplications/oort-backend/issues/11477) ([20e2be1](https://github.com/ReliefApplications/oort-backend/commit/20e2be18487ebc5b9dabe5826368dec35288b859))
* applications permissions for queries ([b92126f](https://github.com/ReliefApplications/oort-backend/commit/b92126fd1822262e226ce6ce0c1e8e3df1c7c427))
* applications permissions for types ([6d0a3b9](https://github.com/ReliefApplications/oort-backend/commit/6d0a3b9a198fbd0c055f3ebbb0b33ce7e3a49d8c))
* Authenticate with keycloak ([ac82779](https://github.com/ReliefApplications/oort-backend/commit/ac8277905d5653c1514d413d7fa6b673b6d17077))
* auto add incrementalId field to record [#11375](https://github.com/ReliefApplications/oort-backend/issues/11375) ([c67a222](https://github.com/ReliefApplications/oort-backend/commit/c67a2227b44e330d228c50cdd0fabcb0b789fe25))
* can attach files in email [#29348](https://github.com/ReliefApplications/oort-backend/issues/29348) ([6cb9a27](https://github.com/ReliefApplications/oort-backend/commit/6cb9a27ceee3cface1dfe9031f9d18fc14b290c5))
* can edit position attributes ([b2d95ca](https://github.com/ReliefApplications/oort-backend/commit/b2d95ca9c95a2ddef8c155de13e566b6c892ce8b))
* can now +/- today date in filtering [#11696](https://github.com/ReliefApplications/oort-backend/issues/11696) ([b1767d1](https://github.com/ReliefApplications/oort-backend/commit/b1767d12098b7728972a8dbb1e2dd2f695834094))
* can use form as a field [#28944](https://github.com/ReliefApplications/oort-backend/issues/28944) ([a765672](https://github.com/ReliefApplications/oort-backend/commit/a765672552f4de8c28cdc9e7d658d0022eb2c660))
* can use public api conf ([a672d77](https://github.com/ReliefApplications/oort-backend/commit/a672d77d7173587af83c167df31f5dba918992e2))
* can use public api conf ([bb6774e](https://github.com/ReliefApplications/oort-backend/commit/bb6774e9a4e5afc23a9a5557856e5a21ae12a705))
* Change type of incrementalID to be ID [#11375](https://github.com/ReliefApplications/oort-backend/issues/11375) ([7bb5e46](https://github.com/ReliefApplications/oort-backend/commit/7bb5e469fe198c0bfc2aa056ac51383c9d1636a5))
* email from back [#25833](https://github.com/ReliefApplications/oort-backend/issues/25833) ([fc9b85b](https://github.com/ReliefApplications/oort-backend/commit/fc9b85b76114d985c6c785a1c292c50cee43d5b4))
* fill createdBy in PullJob using email match [#11063](https://github.com/ReliefApplications/oort-backend/issues/11063) ([4b93f40](https://github.com/ReliefApplications/oort-backend/commit/4b93f4022c3b1d36a2fa0b89306eca1c941c7657))
* Inherit onCompleteExpression from core form [#11271](https://github.com/ReliefApplications/oort-backend/issues/11271) ([1a7c340](https://github.com/ReliefApplications/oort-backend/commit/1a7c3405a4aa500e2893c44389f9f83dadd466ef))
* move aggregation logic in back ([7316ddc](https://github.com/ReliefApplications/oort-backend/commit/7316ddcd4f24e323cd743d332c1ef1590ea50341))
* optional comment field for some questions [#11322](https://github.com/ReliefApplications/oort-backend/issues/11322) ([62b1911](https://github.com/ReliefApplications/oort-backend/commit/62b1911964539da68819cf9472d61d19aff6ba14))
* pagination for notifications ([1f42ca5](https://github.com/ReliefApplications/oort-backend/commit/1f42ca537e8225d040d44417923113df4fc08250))
* preview email [#27626](https://github.com/ReliefApplications/oort-backend/issues/27626) ([62c2e14](https://github.com/ReliefApplications/oort-backend/commit/62c2e147002c9cfdc6095c810e766313c168210b))
* remove pull job link to applications [#10628](https://github.com/ReliefApplications/oort-backend/issues/10628) ([36919ec](https://github.com/ReliefApplications/oort-backend/commit/36919ecbce3111575cfcd0fad1780860dc871368))
* remove unused safeID parameter for apiConfig [#16099](https://github.com/ReliefApplications/oort-backend/issues/16099) ([e23686d](https://github.com/ReliefApplications/oort-backend/commit/e23686d5017105400fe2e3cd87d524dc3c39f8d0))
* set up client authentication for e2e tests ([4b47755](https://github.com/ReliefApplications/oort-backend/commit/4b47755abdb8985b7772763aa2d30d34c05f0275))
* support createdBy and lastUpdatedBy fields [#24829](https://github.com/ReliefApplications/oort-backend/issues/24829) ([a13e4af](https://github.com/ReliefApplications/oort-backend/commit/a13e4af8294e5000c974e873970309c18a1bbab1))
* support groupBy and addFields stages [#24823](https://github.com/ReliefApplications/oort-backend/issues/24823) ([8bc18dd](https://github.com/ReliefApplications/oort-backend/commit/8bc18ddb29e878be6ee722cfc305651777547c01))
* support related resource fields [#24829](https://github.com/ReliefApplications/oort-backend/issues/24829) ([acd2c72](https://github.com/ReliefApplications/oort-backend/commit/acd2c72facee60790d1c7668c20e319de201e86a))
* support sort on text instead of value [#16669](https://github.com/ReliefApplications/oort-backend/issues/16669) ([f18b32f](https://github.com/ReliefApplications/oort-backend/commit/f18b32f4107e0d4dfff7bd55d43e17a66acebeca))
* update CI to deploy mongodb test database [#16673](https://github.com/ReliefApplications/oort-backend/issues/16673) ([83ac7e4](https://github.com/ReliefApplications/oort-backend/commit/83ac7e45d96597b0587c588642afab13eec74849))
* users as question [#11636](https://github.com/ReliefApplications/oort-backend/issues/11636) ([9bf490c](https://github.com/ReliefApplications/oort-backend/commit/9bf490c3af293e6c9ec41194886e29c3d315d0ed))


### Reverts

* Revert "fix filter not working on incrementalId" This reverts commit 1d7cc45475daf793efa9ababdca8d6bcdd8d65f0. ([68281c6](https://github.com/ReliefApplications/oort-backend/commit/68281c6105544c6cf94594aa688da2f282cbc2c4))
* Revert "Add a field settings to steps" ([0d42457](https://github.com/ReliefApplications/oort-backend/commit/0d4245722bae42fe72a38c69a98681ec34494ab2))
* Revert "Trying to add a context to subscriptions" ([64e86a2](https://github.com/ReliefApplications/oort-backend/commit/64e86a257f41215a8ef04c0b9e0dbd264d813287))
