# [2.6.0](https://github.com/ReliefApplications/ems-backend/compare/v2.5.1...v2.6.0) (2024-01-25)


### Bug Fixes

* filtering using boolean on ref data would not work ([712fac7](https://github.com/ReliefApplications/ems-backend/commit/712fac7c91abe7d649147375d3abad1068df90a1))


### Features

* allow addFields stage for reference data aggregations ([#907](https://github.com/ReliefApplications/ems-backend/issues/907)) ([75e505c](https://github.com/ReliefApplications/ems-backend/commit/75e505c55a35001df80620c176916031b3583554))
* allow graphql reference data to pass variables ([#932](https://github.com/ReliefApplications/ems-backend/issues/932)) ([d64910e](https://github.com/ReliefApplications/ems-backend/commit/d64910e25fb6aa02c1193e1be4cf2f21c955a32d))
* reference data aggregation now supports graphql variables injection ([#947](https://github.com/ReliefApplications/ems-backend/issues/947)) ([d5a2085](https://github.com/ReliefApplications/ems-backend/commit/d5a208550ad85fb79e5618e5442721219b85c650))
* use graphql reference data variables in layers ([#948](https://github.com/ReliefApplications/ems-backend/issues/948)) ([9cb70b8](https://github.com/ReliefApplications/ems-backend/commit/9cb70b86628cebfcc1aa66d7c238741783544d37))

# [2.6.0](https://github.com/ReliefApplications/ems-backend/compare/v2.5.1...v2.6.0) (2024-01-23)


### Bug Fixes

* filtering using boolean on ref data would not work ([712fac7](https://github.com/ReliefApplications/ems-backend/commit/712fac7c91abe7d649147375d3abad1068df90a1))


### Features

* allow addFields stage for reference data aggregations ([#907](https://github.com/ReliefApplications/ems-backend/issues/907)) ([75e505c](https://github.com/ReliefApplications/ems-backend/commit/75e505c55a35001df80620c176916031b3583554))
* allow graphql reference data to pass variables ([#932](https://github.com/ReliefApplications/ems-backend/issues/932)) ([d64910e](https://github.com/ReliefApplications/ems-backend/commit/d64910e25fb6aa02c1193e1be4cf2f21c955a32d))
* reference data aggregation now supports graphql variables injection ([#947](https://github.com/ReliefApplications/ems-backend/issues/947)) ([d5a2085](https://github.com/ReliefApplications/ems-backend/commit/d5a208550ad85fb79e5618e5442721219b85c650))
* use graphql reference data variables in layers ([#948](https://github.com/ReliefApplications/ems-backend/issues/948)) ([9cb70b8](https://github.com/ReliefApplications/ems-backend/commit/9cb70b86628cebfcc1aa66d7c238741783544d37))

## [2.5.1](https://github.com/ReliefApplications/ems-backend/compare/v2.5.0...v2.5.1) (2024-01-23)


### Bug Fixes

* allow reference data aggregations to use series in mapping ([772e539](https://github.com/ReliefApplications/ems-backend/commit/772e539858b502703e57b10e5e1ffc2d34ff8804))
* duplication of application would fail when pages would not exist ([#930](https://github.com/ReliefApplications/ems-backend/issues/930)) ([3629151](https://github.com/ReliefApplications/ems-backend/commit/3629151a4f852a1930479fdcea7186c02f992232))
* empty filters array always returns false ([#936](https://github.com/ReliefApplications/ems-backend/issues/936)) ([94066d8](https://github.com/ReliefApplications/ems-backend/commit/94066d814251a99e162d7387af6401870e9f7e9f))
* ownership could break pull job ([5707a66](https://github.com/ReliefApplications/ems-backend/commit/5707a66bf5ea03f3b244f7ac07ccf4d82f1ac313))

# [2.5.0](https://github.com/ReliefApplications/ems-backend/compare/v2.4.4...v2.5.0) (2024-01-10)


### Features

* use cursor pagination for users ([#925](https://github.com/ReliefApplications/ems-backend/issues/925)) ([ac8b343](https://github.com/ReliefApplications/ems-backend/commit/ac8b34347a868c377fcaaec7172bde8a4f1f23ae))

## [2.4.4](https://github.com/ReliefApplications/ems-backend/compare/v2.4.3...v2.4.4) (2024-01-09)


### Bug Fixes

* dashboard filter would not correctly save in some cases ([4f67ce2](https://github.com/ReliefApplications/ems-backend/commit/4f67ce29019b0dd862d27897ed16c0764aca171b))

## [2.4.3](https://github.com/ReliefApplications/ems-backend/compare/v2.4.2...v2.4.3) (2024-01-08)


### Bug Fixes

* check if permission exists when editing resources, during application duplication ([#914](https://github.com/ReliefApplications/ems-backend/issues/914)) ([838cc6c](https://github.com/ReliefApplications/ems-backend/commit/838cc6c36eb0d4a107e98663aa14c4f4e913bd00))
* duplication of application would sometimes fail due to incorrect test on existence of pages ([51f417f](https://github.com/ReliefApplications/ems-backend/commit/51f417fa0bccbc41068c99a80da23410c3479cd1))


### Performance Improvements

* replace rabbitmq with redis ([#810](https://github.com/ReliefApplications/ems-backend/issues/810)) ([8d1e175](https://github.com/ReliefApplications/ems-backend/commit/8d1e175b1efb0a36f700335f324e048915800faf))

## [2.4.2](https://github.com/ReliefApplications/ems-backend/compare/v2.4.1...v2.4.2) (2023-12-21)


### Bug Fixes

* add missing context filter in ref data layer ([e9ed89f](https://github.com/ReliefApplications/ems-backend/commit/e9ed89f34682ae710e67c4c18ba4cd286ca5895b))
* aggregation on null question using choices from refData ([#905](https://github.com/ReliefApplications/ems-backend/issues/905)) ([fad6120](https://github.com/ReliefApplications/ems-backend/commit/fad6120954a2ed76e65785bf68afb30dcc49391e))

## [2.4.1](https://github.com/ReliefApplications/ems-backend/compare/v2.4.0...v2.4.1) (2023-12-20)


### Bug Fixes

* changes on reference data would break the back ([73ca9de](https://github.com/ReliefApplications/ems-backend/commit/73ca9de0b05dc4cff44b0799d8f9a9ac10ed8162))

# [2.4.0](https://github.com/ReliefApplications/ems-backend/compare/v2.3.1...v2.4.0) (2023-12-18)


### Bug Fixes

* aggregation not working fine for most ref data ([#877](https://github.com/ReliefApplications/ems-backend/issues/877)) ([27740e2](https://github.com/ReliefApplications/ems-backend/commit/27740e29377c31abf53611612fae8d87e0cb0c3e))
* aggregation on reference data not working correctly ([392b624](https://github.com/ReliefApplications/ems-backend/commit/392b6241db5b4dc11591bdd0918046d96f4ed74c))


### Features

* add support for reference data aggregations in layers ([#875](https://github.com/ReliefApplications/ems-backend/issues/875)) ([cb7af9a](https://github.com/ReliefApplications/ems-backend/commit/cb7af9a127e917241c421acf82cfe074c8e752d7))
* allow filtering on ref data aggregations ([#885](https://github.com/ReliefApplications/ems-backend/issues/885)) ([8c4fec3](https://github.com/ReliefApplications/ems-backend/commit/8c4fec3f212a87a1165a7e699e5b532f1bd21093))
* allow reference data to be used in charts ([#867](https://github.com/ReliefApplications/ems-backend/issues/867)) ([56a1d79](https://github.com/ReliefApplications/ems-backend/commit/56a1d79b2b440179db9fe34b88ba37469a9a8fb7)), closes [#68346](https://github.com/ReliefApplications/ems-backend/issues/68346) [#68346](https://github.com/ReliefApplications/ems-backend/issues/68346) [#68346](https://github.com/ReliefApplications/ems-backend/issues/68346)
* allow to preview aggregation data ([#886](https://github.com/ReliefApplications/ems-backend/issues/886)) ([3952cb5](https://github.com/ReliefApplications/ems-backend/commit/3952cb5a42ed91213579818c9efd58b7a6dd033a))
* allow to use context in page widgets ([#595](https://github.com/ReliefApplications/ems-backend/issues/595)) ([e2772dc](https://github.com/ReliefApplications/ems-backend/commit/e2772dc0664e67e3c8557b22782d89ca8b23d742))
* support unwind in ref data aggregations ([#893](https://github.com/ReliefApplications/ems-backend/issues/893)) ([a041262](https://github.com/ReliefApplications/ems-backend/commit/a041262c3433495be28d83b49e0454904cff1759))
* use context filter in ref data aggregation ([843c5c0](https://github.com/ReliefApplications/ems-backend/commit/843c5c0301dc077ded2a664cece3628d20cb3799))

## [2.3.1](https://github.com/ReliefApplications/ems-backend/compare/v2.3.0...v2.3.1) (2023-12-13)


### Bug Fixes

* revert changes on time fields in exports ([5d60245](https://github.com/ReliefApplications/ems-backend/commit/5d60245d0c7d7a69cf31ebe944143e768234b862))

# [2.3.0](https://github.com/ReliefApplications/ems-backend/compare/v2.2.0...v2.3.0) (2023-12-12)


### Features

* eios pulljob assign ownership ([#871](https://github.com/ReliefApplications/ems-backend/issues/871)) ([54261bc](https://github.com/ReliefApplications/ems-backend/commit/54261bca332bc3b9c6e4a167d188f9e630adfa19))
  

## [2.2.1](https://github.com/ReliefApplications/ems-backend/compare/v2.2.0...v2.2.1) (2023-12-13)


### Bug Fixes

* revert changes on time fields in exports ([5d60245](https://github.com/ReliefApplications/ems-backend/commit/5d60245d0c7d7a69cf31ebe944143e768234b862))

# [2.2.0](https://github.com/ReliefApplications/ems-backend/compare/v2.1.11...v2.2.0) (2023-12-08)


### Bug Fixes

* ability on records could fail due to missing resource ([b217df1](https://github.com/ReliefApplications/ems-backend/commit/b217df11982ecfdbe51293ceb3d9b0a1968521f1))
* add access tokens to all internal requests ([067bd1c](https://github.com/ReliefApplications/ems-backend/commit/067bd1c788070a05c02053eb8919c5ddf2e1288e))
* Add default values for gridOptions in DashboardType to prevent unwanted results when going from one dashboard to another one ([#844](https://github.com/ReliefApplications/ems-backend/issues/844)) ([f48459f](https://github.com/ReliefApplications/ems-backend/commit/f48459f1c2eb2ab8dd98e016ef617b542a33cd41))
* added sorting on id field to avoid having missing records ([#842](https://github.com/ReliefApplications/ems-backend/issues/842)) ([935fe1b](https://github.com/ReliefApplications/ems-backend/commit/935fe1b24be318485bf28faa9bc9f53d5e22df81))
* api configuration would incorrectly save edit api configuration auth type ([e97a8d7](https://github.com/ReliefApplications/ems-backend/commit/e97a8d7d6e3b96ef8c6ff83980db8eaca62d24bb))
* API edit mutation could fail because of incorrect check of arguments ([00b0e0d](https://github.com/ReliefApplications/ems-backend/commit/00b0e0dbd11bd887bde9adef117b3fe8b8b51869))
* audience would not be available ([4e76800](https://github.com/ReliefApplications/ems-backend/commit/4e76800656354c10f3c1497ae98bc33f2bfff9ee))
* boolean would not correctly be calculated in getFilter ([58dc862](https://github.com/ReliefApplications/ems-backend/commit/58dc8621b4237e92eb6f17e5b189be647bd86ad3))
* build issue after 2.x.x merge ([1d48814](https://github.com/ReliefApplications/ems-backend/commit/1d48814044a29c6b9009f54515737523c5005893))
* build would fail due to incorrect default value for auth audience ([8985cc0](https://github.com/ReliefApplications/ems-backend/commit/8985cc05b4d52571be6362995c90c54eed3fcc57))
* calculated fields in resource question breaking search in grid ([c5287eb](https://github.com/ReliefApplications/ems-backend/commit/c5287ebf44d601f6ef62d481bb22f71a62e45bb2))
* check record trigger would break build ([06691dd](https://github.com/ReliefApplications/ems-backend/commit/06691dd816c938a21b94bb4b0efd994c81bf8df2))
* client flow authentication would not work due to incorrect update when migrating mongoose version ([18a4683](https://github.com/ReliefApplications/ems-backend/commit/18a46838c35b3d1e84964c7898095752736f9fa1))
* cloning application would not clone filter & grid options in dashboards ([3162811](https://github.com/ReliefApplications/ems-backend/commit/3162811fdc0c2775190d9abce12d6fd3f8031d99))
* code could not compile ([5699e03](https://github.com/ReliefApplications/ems-backend/commit/5699e03e19b8204c4a66bc5af9a0056955311abf))
* contains filter not working if value is single ([b7e5558](https://github.com/ReliefApplications/ems-backend/commit/b7e55584e8d5ddbc3bf145f7042f5a7250b4cbe0))
* could not always get fields from ref data ([32e83d4](https://github.com/ReliefApplications/ems-backend/commit/32e83d44995fc7fe1e2c5d8f191cb0a6211f4739))
* could not download application with existing name ([#795](https://github.com/ReliefApplications/ems-backend/issues/795)) ([c9f9d8a](https://github.com/ReliefApplications/ems-backend/commit/c9f9d8a07ce8e64a4e9b873df14c2ff6ddbe8baa))
* could not get canUpdate / canDelete on meta ([323330a](https://github.com/ReliefApplications/ems-backend/commit/323330aec8b9822d85527c8967e935a05738a463))
* could not get map data due to incorrect id check ([6906c21](https://github.com/ReliefApplications/ems-backend/commit/6906c21dcbae6564c1a5c554ff7b576eb268cac3))
* could not load datasources in layers ([9e1b841](https://github.com/ReliefApplications/ems-backend/commit/9e1b841200852f284680aee9ba045730bc2c3f03))
* dashboard queries would take too much time if context ([7783bff](https://github.com/ReliefApplications/ems-backend/commit/7783bff5a58fb06fb2697924a4eafa6b21548fce))
* disable custom notifications scheduler to prevent system to crash ([00c3e22](https://github.com/ReliefApplications/ems-backend/commit/00c3e22ca757a1f14562c4ce4e2a2b99ea20ca1d))
* Download file method would break due to missing file destination ([aac3f63](https://github.com/ReliefApplications/ems-backend/commit/aac3f63ba4494db672cc4b82b26d63fc6c5ef734))
* download file would sometimes not throw correct error or resolve request ([46e2cc6](https://github.com/ReliefApplications/ems-backend/commit/46e2cc6f96861bc9823780615e3ef22291738b70))
* download of template for records upload would query records even if not needed ([b263bdb](https://github.com/ReliefApplications/ems-backend/commit/b263bdb59750698368131c9ed4ac7d89429767fe))
* editing a dashboard inside a workflow could cause unexpected type issue due to incorrect error handling ([75ccd9a](https://github.com/ReliefApplications/ems-backend/commit/75ccd9a96f7acfd8eb7970e57644f055becaec34))
* editRecord could break if previous version did not have any data ([85a2d5c](https://github.com/ReliefApplications/ems-backend/commit/85a2d5c3cd7c7e1a064aed51b9929febbf3296d2))
* editRecord would not correctly check non editable fields ([#815](https://github.com/ReliefApplications/ems-backend/issues/815)) ([5ca7717](https://github.com/ReliefApplications/ems-backend/commit/5ca771719a84e1eee9771293ac4e979bb39e9849))
* error on fetching records with no data ([4986e1d](https://github.com/ReliefApplications/ems-backend/commit/4986e1dfebf40170bde92fe875c7eab4e6875707))
* filtering records on form name would break query ([c2d8e58](https://github.com/ReliefApplications/ems-backend/commit/c2d8e58601bd73c2362d672bab4e84a00870896a))
* geofiltering would break layers if empty ([c22a882](https://github.com/ReliefApplications/ems-backend/commit/c22a8827f1f8e9b5b554f2b80bba971df8611de6))
* gis/feature route was broken due to incorrect layout / aggregation setup ([7a3cdd7](https://github.com/ReliefApplications/ems-backend/commit/7a3cdd70457f59ebca31d13ba36b3ea114c6f518))
* grant ability to read api configuration & reference data to all records ([d45c394](https://github.com/ReliefApplications/ems-backend/commit/d45c394beac565915fe968fbc4c7285c6fb127ce))
* graphQL queries would be cached by proxy ([1dd9fba](https://github.com/ReliefApplications/ems-backend/commit/1dd9fba9f67b99674599c83dd9b267a081ef47fa))
* in some edge cases, dashboard structure would be incorrectly passed in graphql ([#817](https://github.com/ReliefApplications/ems-backend/issues/817)) ([2a5866e](https://github.com/ReliefApplications/ems-backend/commit/2a5866eca15f0fd26a2c24378a46a3fac50f3490))
* inccorect filter in getautoassigned role ([41a0143](https://github.com/ReliefApplications/ems-backend/commit/41a0143723ea06410388490b73a6383630105189))
* incorrect audience settings ([9c8e710](https://github.com/ReliefApplications/ems-backend/commit/9c8e710c3d08ee2ccea504a2a410dceeccd62735))
* incorrect display of date fields in export & history ([#857](https://github.com/ReliefApplications/ems-backend/issues/857)) ([5262f8b](https://github.com/ReliefApplications/ems-backend/commit/5262f8b5c50315633ff45bc3a777fd7dcd1c4a87))
* incorrect mutation to set filter at dashboard level ([2d57100](https://github.com/ReliefApplications/ems-backend/commit/2d5710036e9eab6780137f7a129cc7190628866c))
* incorrect names for some matrix questions ([1fedb51](https://github.com/ReliefApplications/ems-backend/commit/1fedb51ed129924e47aeb68499bc236287d96091))
* incorrect sorting on api configurations ([#852](https://github.com/ReliefApplications/ems-backend/issues/852)) ([1260ceb](https://github.com/ReliefApplications/ems-backend/commit/1260cebd5c88b7a6da8236a723a422729ab88723))
* incorrect timezone in calculated fields. Now enforcing user timezone ([296aab4](https://github.com/ReliefApplications/ems-backend/commit/296aab4a1d4bd102fb7b2f8858fb71914f31fd62))
* issue with layers using lat lng fields ([88f75f6](https://github.com/ReliefApplications/ems-backend/commit/88f75f6899c6e0a4da40bee2a7ffc195b2b2d5af))
* layer input could not allow saving of heatmap layer ([6da8988](https://github.com/ReliefApplications/ems-backend/commit/6da89881a76b022ec236926a933fdcc9930d7ea4))
* layers using lat & long could break popup ([#722](https://github.com/ReliefApplications/ems-backend/issues/722)) ([70217f5](https://github.com/ReliefApplications/ems-backend/commit/70217f5abf6b1aeb66c63352d532001450afa2fa))
* matrix in grid and summary card not correctly saved in db ([#748](https://github.com/ReliefApplications/ems-backend/issues/748)) ([e37b342](https://github.com/ReliefApplications/ems-backend/commit/e37b3422b47a39c55bb77486e08dc79cd430c937))
* number question values, when saved as string, would not match in filters ([#774](https://github.com/ReliefApplications/ems-backend/issues/774)) ([2dc18ec](https://github.com/ReliefApplications/ems-backend/commit/2dc18ecd0a7241d8718f6cadfe915e5f42f975f2))
* ping request using cache and decrypting twice ([#826](https://github.com/ReliefApplications/ems-backend/issues/826)) ([14b26c4](https://github.com/ReliefApplications/ems-backend/commit/14b26c4e125d22fd489afce95cf060f51cda07f8))
* prevent any default field to be used in a form ([6e52fda](https://github.com/ReliefApplications/ems-backend/commit/6e52fda5e936d2f95ec18f7a00c5b2cf18023a11))
* prevent contextual content in pages to be duplicated ([926f476](https://github.com/ReliefApplications/ems-backend/commit/926f476af9e1f1de3ff5d78ab4398872ebfdaf1f))
* pulljobs failing would crash server ([e416ee5](https://github.com/ReliefApplications/ems-backend/commit/e416ee5f6c711b5c705c8956c4a4478005728cc9))
* redis client error ([2c45593](https://github.com/ReliefApplications/ems-backend/commit/2c4559334e937b62e98bfdf3bea250b36ce5f5eb))
* reference data not getting exported ([#858](https://github.com/ReliefApplications/ems-backend/issues/858)) ([24ad915](https://github.com/ReliefApplications/ems-backend/commit/24ad915ba5eceb38d263c2094372f6d15d30a4fb))
* reference data query not working due to incorrect cursor pagination ([96d7298](https://github.com/ReliefApplications/ems-backend/commit/96d7298796d2d952ad6f66dd745fa4000cf46567))
* some layers would not work due to incorrect geoField ([f409b1c](https://github.com/ReliefApplications/ems-backend/commit/f409b1c5547b9f7c74a239e72d3f84236923e4e1))
* some permissions issues when not admin ([794683d](https://github.com/ReliefApplications/ems-backend/commit/794683d7eeda6e82a8b0791250c7ce788a3ac984))
* updated layer model to also saves popup fields info ([#670](https://github.com/ReliefApplications/ems-backend/issues/670)) ([eb43289](https://github.com/ReliefApplications/ems-backend/commit/eb43289336b5d630ed277862ea6500577d225fb3))
* upload would fail most of the time for tagbox / checkbox questions ([243f77d](https://github.com/ReliefApplications/ems-backend/commit/243f77d33971455cd1f26995d11c36dc3e37d154))
* users roles not appearing in applications ([#835](https://github.com/ReliefApplications/ems-backend/issues/835)) ([d05d061](https://github.com/ReliefApplications/ems-backend/commit/d05d0619635bb2c26ac902fc06789b6d58b899c7))
* users who can edit application can now delete the steps & pages ([cf130ce](https://github.com/ReliefApplications/ems-backend/commit/cf130ce61d82a6b3690dd092239e79b2015e75db))
* using size operator on nullish values in aggregations on records ([#836](https://github.com/ReliefApplications/ems-backend/issues/836)) ([5eca1c7](https://github.com/ReliefApplications/ems-backend/commit/5eca1c704264fee19eb555f34ec6860326fa44df))


### Features

* Ability to save draft record ([#802](https://github.com/ReliefApplications/ems-backend/issues/802)) ([d1b1e3b](https://github.com/ReliefApplications/ems-backend/commit/d1b1e3b263b5db5211edfc8e7c3deee05f2517bf))
* add auth code APIs ([#789](https://github.com/ReliefApplications/ems-backend/issues/789)) ([20ff5d8](https://github.com/ReliefApplications/ems-backend/commit/20ff5d8b9732b5882a98f9440411c8d69ef47986))
* add contextual filtering ([0a734e2](https://github.com/ReliefApplications/ems-backend/commit/0a734e27cb427d868b8085206aecac77842ba075))
* add dashboard buttons to schema ([fe7bd55](https://github.com/ReliefApplications/ems-backend/commit/fe7bd55de6931364db0c08f90a4c4da143e2d006))
* add new route of scss conversion to css ([691794d](https://github.com/ReliefApplications/ems-backend/commit/691794d4e873776e4aeb0b23a6abcc0eb9741f03))
* allow caching of more API requests ([#825](https://github.com/ReliefApplications/ems-backend/issues/825)) ([105f0a5](https://github.com/ReliefApplications/ems-backend/commit/105f0a50685363f6eab3bc936df308774b7e7015))
* allow draft edition of records ([32148b1](https://github.com/ReliefApplications/ems-backend/commit/32148b1ff093d0553a3124bf0a32b0e6d3eebe49)), closes [feat/AB#65023](https://github.com/feat/AB/issues/65023)
* Allow MultiPoint and MultiPolygon on layer features ([514d3ee](https://github.com/ReliefApplications/ems-backend/commit/514d3eefcbc1bbaf0c755ecbeed0e8fca3dbb66b))
* allow single widget page ([53762f4](https://github.com/ReliefApplications/ems-backend/commit/53762f43aaf1c219c60aac01d9a479495fd75a11))
* can now archive application pages and restore them ([a76928a](https://github.com/ReliefApplications/ems-backend/commit/a76928a93e482911c114d71c289beb7c6a7e70e2))
* can now edit page / step 's icons ([#749](https://github.com/ReliefApplications/ems-backend/issues/749)) ([30bb81c](https://github.com/ReliefApplications/ems-backend/commit/30bb81cdecb2a4c27195c1654544db887b5ff79e))
* can now group layers ([074cb2b](https://github.com/ReliefApplications/ems-backend/commit/074cb2b9cb5cdce22e5aadf81e641240a5d77fa6))
* can now hide application menu by default ([2519344](https://github.com/ReliefApplications/ems-backend/commit/2519344d7bffa0f761599da8846a8db5ecf60270))
* can now query historical data ([#752](https://github.com/ReliefApplications/ems-backend/issues/752)) ([75b1c8a](https://github.com/ReliefApplications/ems-backend/commit/75b1c8ac78131455c5019129e83e76534b27e2a3))
* can now sort aggregations on records ([a09f2c8](https://github.com/ReliefApplications/ems-backend/commit/a09f2c8b9924e9cb7b179b8acce89b281c3b9fe3))
* can now use infinite aggregations ([3f190d4](https://github.com/ReliefApplications/ems-backend/commit/3f190d407029b09d22d5ab2cc60d377175e5d776))
* can save custom grid options per dashboard ([#824](https://github.com/ReliefApplications/ems-backend/issues/824)) ([8779433](https://github.com/ReliefApplications/ems-backend/commit/87794338b35f5b393e22ea4e6aa2901cf346a411))
* cluster layers now support new options ([#757](https://github.com/ReliefApplications/ems-backend/issues/757)) ([f9b58b3](https://github.com/ReliefApplications/ems-backend/commit/f9b58b317d8838c8226ff87f3b2112f7f739db28))
* get draft data from single record custom query, by passing data argument ([509b670](https://github.com/ReliefApplications/ems-backend/commit/509b67044190f1dcdc17c74f6b3c28ddd8168400))
* now use filter at dashboard level ([#834](https://github.com/ReliefApplications/ems-backend/issues/834)) ([6b3f4e9](https://github.com/ReliefApplications/ems-backend/commit/6b3f4e9dfcacdf2fd51c787eaba958a0c392f1a5))
* possibility to hide pages' ([f5ca2e6](https://github.com/ReliefApplications/ems-backend/commit/f5ca2e65698cc26fac6a91220e844eae0252e9fb))
* query of polygon features on map ([fc33c06](https://github.com/ReliefApplications/ems-backend/commit/fc33c06d2c598e68d4394ab503d23d6507889292))

## [2.1.12](https://github.com/ReliefApplications/ems-backend/compare/v2.1.11...v2.1.12) (2023-12-04)


### Bug Fixes

* client flow authentication would not work due to incorrect update when migrating mongoose version ([18a4683](https://github.com/ReliefApplications/ems-backend/commit/18a46838c35b3d1e84964c7898095752736f9fa1))

## [2.1.11](https://github.com/ReliefApplications/oort-backend/compare/v2.1.10...v2.1.11) (2023-11-14)


### Bug Fixes

* incorrect metadata for createdBy / lastUpdatedBy fields ([#829](https://github.com/ReliefApplications/oort-backend/issues/829)) ([c6892f3](https://github.com/ReliefApplications/oort-backend/commit/c6892f35b24d6c2b350599275de82280f9c5630a))

## [2.1.10](https://github.com/ReliefApplications/oort-backend/compare/v2.1.9...v2.1.10) (2023-11-12)


### Bug Fixes

* record history would not correctly display changes on resources for some users ([f2cfa5f](https://github.com/ReliefApplications/oort-backend/commit/f2cfa5f7d9f10613b2fc22d1a46ae65bce098bd3))

## [2.1.9](https://github.com/ReliefApplications/oort-backend/compare/v2.1.8...v2.1.9) (2023-11-10)


### Bug Fixes

* could not revert past history versions ([d9999a1](https://github.com/ReliefApplications/oort-backend/commit/d9999a1666d12e1282c28b334ce91b0b24cf8142))
* some requests could not be cached due to incorrect method check ([61e44c7](https://github.com/ReliefApplications/oort-backend/commit/61e44c7a2c03160a81d4d3d7fcaa05e43ec1dbb6))

## [2.1.8](https://github.com/ReliefApplications/oort-backend/compare/v2.1.7...v2.1.8) (2023-11-07)


### Bug Fixes

* add resource fields to history ([71e708d](https://github.com/ReliefApplications/oort-backend/commit/71e708dcfb4f36f6b955624cc15fbfc09a3b4c38))
* owner field could create issue in history ([0b08985](https://github.com/ReliefApplications/oort-backend/commit/0b089850852b02b7a70740c97d6aaee33c9a0c0d))

## [2.1.7](https://github.com/ReliefApplications/oort-backend/compare/v2.1.6...v2.1.7) (2023-11-06)


### Bug Fixes

* allow parallel sorting in aggregations ([#798](https://github.com/ReliefApplications/oort-backend/issues/798)) ([8b7a8ec](https://github.com/ReliefApplications/oort-backend/commit/8b7a8ec84346afc686190d2b7d321375b71d7b74))

## [2.1.6](https://github.com/ReliefApplications/oort-backend/compare/v2.1.5...v2.1.6) (2023-11-03)


### Bug Fixes

* check of calculated fields in pipeline of 'all' query could break some queries ([00e88f8](https://github.com/ReliefApplications/oort-backend/commit/00e88f8087726ba896a35f898049105d1d55062c))
* updated editApiConfiguration mutation ([#793](https://github.com/ReliefApplications/oort-backend/issues/793)) ([dbe15c6](https://github.com/ReliefApplications/oort-backend/commit/dbe15c6cfb7b9754c2f06bda671bc4b43acc1885))

## [2.1.5](https://github.com/ReliefApplications/oort-backend/compare/v2.1.4...v2.1.5) (2023-10-25)


### Bug Fixes

* could not get first createdBy in history ([47b33fd](https://github.com/ReliefApplications/oort-backend/commit/47b33fd25f84c7c49ee09503a1fbe8f41b40473d))

## [2.1.4](https://github.com/ReliefApplications/oort-backend/compare/v2.1.3...v2.1.4) (2023-10-24)


### Bug Fixes

* incorrect list of permissions sent to back-office role editor ([#786](https://github.com/ReliefApplications/oort-backend/issues/786)) ([d4377c0](https://github.com/ReliefApplications/oort-backend/commit/d4377c020674c2737d02f1781ff002bf7810cccc))
* non-admin users could not download history ([#785](https://github.com/ReliefApplications/oort-backend/issues/785)) ([862fdcc](https://github.com/ReliefApplications/oort-backend/commit/862fdccc44a77264299aac2b47ecfe8024f70b41))

## [2.1.3](https://github.com/ReliefApplications/oort-backend/compare/v2.1.2...v2.1.3) (2023-10-18)


### Bug Fixes

* playground was unavailable due to apollo update ([#778](https://github.com/ReliefApplications/oort-backend/issues/778)) ([31534b5](https://github.com/ReliefApplications/oort-backend/commit/31534b5b8d547f2a9ff3ca308884f3b97ec10dd9))

## [2.1.2](https://github.com/ReliefApplications/oort-backend/compare/v2.1.1...v2.1.2) (2023-10-09)


### Bug Fixes

* unfriendly api configuration edition ([#766](https://github.com/ReliefApplications/oort-backend/issues/766)) ([33b7901](https://github.com/ReliefApplications/oort-backend/commit/33b79010f9fa3b4602e75c3c01da09b74a584483))

## [2.1.1](https://github.com/ReliefApplications/oort-backend/compare/v2.1.0...v2.1.1) (2023-10-03)


### Bug Fixes

* API configuration enum type was broken ([d19707c](https://github.com/ReliefApplications/oort-backend/commit/d19707c28935ef281b99f29416e59b6a46890371))

# [2.1.0](https://github.com/ReliefApplications/oort-backend/compare/v2.0.10...v2.1.0) (2023-09-21)


### Features

* can now filter items based on 'at' date ([7b2160d](https://github.com/ReliefApplications/oort-backend/commit/7b2160d1fb4f1011fe683bb08373886e62c2372c))


### Performance Improvements

* Apollo update ([#732](https://github.com/ReliefApplications/oort-backend/issues/732)) ([fc33f53](https://github.com/ReliefApplications/oort-backend/commit/fc33f53d2c169c8a990a906a6b4f54ad3cbc8230)), closes [#720](https://github.com/ReliefApplications/oort-backend/issues/720)

## [2.0.10](https://github.com/ReliefApplications/oort-backend/compare/v2.0.9...v2.0.10) (2023-09-20)


### Bug Fixes

* template name not used when editing record ([f30874a](https://github.com/ReliefApplications/oort-backend/commit/f30874a2bdc5169d7481931c75af1c7d3958b74b))

## [2.0.9](https://github.com/ReliefApplications/oort-backend/compare/v2.0.8...v2.0.9) (2023-09-07)


### Bug Fixes

* only fetch visible fields in export [#35940](https://github.com/ReliefApplications/oort-backend/issues/35940) ([#730](https://github.com/ReliefApplications/oort-backend/issues/730)) ([7effd81](https://github.com/ReliefApplications/oort-backend/commit/7effd81dfb216535f6b6b5349711e2605d5fa6a7))
* unavailable api configuration while fetching user attributes could break ([68e7be4](https://github.com/ReliefApplications/oort-backend/commit/68e7be414a22801fa930321620f62657513b9b3d))
* unavailable api configuration while update user groups could break ([11104fa](https://github.com/ReliefApplications/oort-backend/commit/11104fa15a2dc7f5226610922ad7561eb1b8180f))

## [2.0.8](https://github.com/ReliefApplications/oort-backend/compare/v2.0.7...v2.0.8) (2023-08-25)


### Bug Fixes

* calculated fields edition would not trigger schema update ([23a1bbd](https://github.com/ReliefApplications/oort-backend/commit/23a1bbd8446d5009417da1790292ae0ba57d9dac))
* in record history, some updates would appear in the UI but not in the download ([98e5d37](https://github.com/ReliefApplications/oort-backend/commit/98e5d3795608d990f0ceb38e65cd24fb0cc2adb5))
* only restart server on resource changes, if a calculated field is updated ([a041f13](https://github.com/ReliefApplications/oort-backend/commit/a041f131fc487f24e8943fd99be0abae80c1d388))
* some users without admin permissions on form could not download file ([3963550](https://github.com/ReliefApplications/oort-backend/commit/396355007c7c85566915f45235818101535c43b4))

## [2.0.7](https://github.com/ReliefApplications/oort-backend/compare/v2.0.6...v2.0.7) (2023-08-17)


### Bug Fixes

* aggregations on resource question could fail due to incorrect objectId conversion ([d6e5980](https://github.com/ReliefApplications/oort-backend/commit/d6e59805b5a5ecbb7f4cfbc923164b1c16451fbf))
* typo error in ping proxy route would make it fail for service to service APIs ([5903ecf](https://github.com/ReliefApplications/oort-backend/commit/5903ecfc6b491177c4e54911e7056a256df64264))

## [2.0.6](https://github.com/ReliefApplications/oort-backend/compare/v2.0.5...v2.0.6) (2023-08-09)


### Bug Fixes

* editing a user role in application would prevent to see roles of the user in other application, in the UI ([f1c0afa](https://github.com/ReliefApplications/oort-backend/commit/f1c0afadec79c87d4902c074f26b18439968db3d))

## [2.0.5](https://github.com/ReliefApplications/oort-backend/compare/v2.0.4...v2.0.5) (2023-08-04)


### Bug Fixes

* pull job could not insert records due to missing property in addition of new records ([700c1ab](https://github.com/ReliefApplications/oort-backend/commit/700c1ab087b1869a3295b2acaa9cd0ec4b23106f))

## [2.0.4](https://github.com/ReliefApplications/oort-backend/compare/v2.0.3...v2.0.4) (2023-08-03)


### Bug Fixes

* comments could raise validation errors in survey, due to incorrect settings in validation method ([cf3adbd](https://github.com/ReliefApplications/oort-backend/commit/cf3adbde90d5cc208898d2278f95f4244380511d))

## [2.0.3](https://github.com/ReliefApplications/oort-backend/compare/v2.0.2...v2.0.3) (2023-08-03)


### Bug Fixes

* pagination on users for application & role would not work ([95ae809](https://github.com/ReliefApplications/oort-backend/commit/95ae809483ef8baa61554488723bb0752da419b1))
* search while displaying user would break ([b271647](https://github.com/ReliefApplications/oort-backend/commit/b271647df636153ba4fd78d75cbf30090ece60f9))

## [2.0.2](https://github.com/ReliefApplications/oort-backend/compare/v2.0.1...v2.0.2) (2023-07-14)


### Bug Fixes

* transformRecord could cause issue if resources question was empty ([e8515d6](https://github.com/ReliefApplications/oort-backend/commit/e8515d68dcab6e03935d3a5a5329f6a83c429c7f))

## [2.0.1](https://github.com/ReliefApplications/oort-backend/compare/v2.0.0...v2.0.1) (2023-07-07)


### Bug Fixes

* choicesByUrl could break checkRecordValidation method ([98c15bd](https://github.com/ReliefApplications/oort-backend/commit/98c15bd836f1f3d31f0f0711b6c320cca2447bb3))

# [2.0.0](https://github.com/ReliefApplications/oort-backend/compare/v1.3.17...v2.0.0) (2023-07-03)


### Bug Fixes

* accessible fields would break if no data in record ([8b1b198](https://github.com/ReliefApplications/oort-backend/commit/8b1b19881611211970f626df3379bba88296dc7e))
* add calculated fields used in sorting/filtering/style to pipeline ([#618](https://github.com/ReliefApplications/oort-backend/issues/618)) ([79aa6dd](https://github.com/ReliefApplications/oort-backend/commit/79aa6dd390c9f84f14f0d397ed9ee7500074d8fc))
* added option to export from selection ([e5ed7db](https://github.com/ReliefApplications/oort-backend/commit/e5ed7dbb1039d6647a7ca8e648c27336068b774d))
* aggregation from refData ([962ed69](https://github.com/ReliefApplications/oort-backend/commit/962ed69e227cc4c74de8c79c643ad9ab5065fecd))
* calculated field using concatenation could break data queries ([7417039](https://github.com/ReliefApplications/oort-backend/commit/741703951cabc93438bbd051addd9e87b88d8ae1)), closes [fix/AB#60680](https://github.com/fix/AB/issues/60680)
* can now properly use the columns for styling ([7676364](https://github.com/ReliefApplications/oort-backend/commit/7676364bcb4531c9bf459dec78dd3153fb5134b7))
* change $toString to $convert in concat operation ([37d1152](https://github.com/ReliefApplications/oort-backend/commit/37d1152c083ccdc34ce6075357a55baa47777ef7))
* convert would not always work ([c940d9e](https://github.com/ReliefApplications/oort-backend/commit/c940d9efb9c9ef96f6f9923966bb3dc36c6d539b))
* converting concat operators into string ([fdd96ae](https://github.com/ReliefApplications/oort-backend/commit/fdd96aeed0902af177562c36d1f4a2db42a112cf))
* correctly determine if user locked app ([da1f788](https://github.com/ReliefApplications/oort-backend/commit/da1f7886dde19884d6ffbf9e5a329556ab1453bb))
* could not get correct error from mutations / queries ([48357e5](https://github.com/ReliefApplications/oort-backend/commit/48357e5ec25088a7d72f9a1ffdfe5f11a29b4da9))
* could not update calculated fields ([3f7146c](https://github.com/ReliefApplications/oort-backend/commit/3f7146ca4d934044330b1336ecec6a25ddb34ead))
* could not update canSee / canUpdate permissions of some fields ([121364b](https://github.com/ReliefApplications/oort-backend/commit/121364b11b8680cdebdc5f9d280c3fe16ea47c8e))
* dashboard type would send issue if no page related ([6bb585e](https://github.com/ReliefApplications/oort-backend/commit/6bb585ee448a00bdff13ba84e895980bfff877b7))
* dataRef resolver for multiselect types ([86e1939](https://github.com/ReliefApplications/oort-backend/commit/86e19393c16e81abc0c5e9d3209853511c92c08e))
* delete folder of blob storage was not working ([5e32054](https://github.com/ReliefApplications/oort-backend/commit/5e320545a7c770f3031260cd5d401afeb22931bb))
* edit custom notification gl type, missing one field ([4787519](https://github.com/ReliefApplications/oort-backend/commit/4787519d7b4e755be10568f5286c62d75572d313))
* empty rows & columns could break emails ([26027a7](https://github.com/ReliefApplications/oort-backend/commit/26027a7cd490f614dc4679c99bd1db7a26c25576))
* fields permissions incorrectly being reset ([12379b1](https://github.com/ReliefApplications/oort-backend/commit/12379b141e80887b8b399bee79a58af3e0987343))
* getFilter not working ([cd45bab](https://github.com/ReliefApplications/oort-backend/commit/cd45bab5634bd10bfdfa7b53fd3910108678bc31))
* getRows maximum page size ([#617](https://github.com/ReliefApplications/oort-backend/issues/617)) ([0139322](https://github.com/ReliefApplications/oort-backend/commit/0139322d92126184de5756a07c4de33486c01af7))
* hide fields on  roles with no permission ([3de9a25](https://github.com/ReliefApplications/oort-backend/commit/3de9a25a35a9a786338e8e218a6f51c436e591ef))
* incorrect add manage distribution / template permissions migration would create useless permissions ([cfcceae](https://github.com/ReliefApplications/oort-backend/commit/cfcceaed7a2f471c9f35080f9f6e0c4d54bc9755))
* incorrect meta data in graphql ([cfdc06b](https://github.com/ReliefApplications/oort-backend/commit/cfdc06bfb4de27f06992a7bda037e0937932a1ff))
* incorrect name in export batch ([8b09742](https://github.com/ReliefApplications/oort-backend/commit/8b097422554e54d1be2247f4a2216c579cd88d22))
* incorrect path when downloading file would break the system ([99016fe](https://github.com/ReliefApplications/oort-backend/commit/99016fe06438caea31f79d8837c25e1c92f0977b))
* interrupted cascade deletion of resources ([3244ff0](https://github.com/ReliefApplications/oort-backend/commit/3244ff0697a0dccd1b494ebc4dacd4b7a05a678e))
* issue with mapping ([c6678d5](https://github.com/ReliefApplications/oort-backend/commit/c6678d53e064eb9d87ac3b2aa78bc2b6fcb2e5fa))
* jsonpath not being reflected for rest ref data ([0c20fe8](https://github.com/ReliefApplications/oort-backend/commit/0c20fe8693be8bb5dc21895a3580606c49fab2c8))
* lint ([c3f7f19](https://github.com/ReliefApplications/oort-backend/commit/c3f7f191f59a51ca3e56444dece30490eb9fffed))
* mongoose filter from resource question ([5754acd](https://github.com/ReliefApplications/oort-backend/commit/5754acd6a5d1f7693fa74b8ce6c068e99f2873c1))
* prevent pagination to cause payload error ([e488d7e](https://github.com/ReliefApplications/oort-backend/commit/e488d7eabe3e6e5c6d6d5477343be803ac5331f0)), closes [AB#54896](https://github.com/AB/issues/54896) [AB#54896](https://github.com/AB/issues/54896)
* problems regarding calculated fields ([0c457eb](https://github.com/ReliefApplications/oort-backend/commit/0c457eb0b94ee3730e96602b0b09e4df2fbec78e))
* refData from graphQL API ([04c1982](https://github.com/ReliefApplications/oort-backend/commit/04c19823226bee2cd9d0b731860bd89b1d083cd8))
* removed old resource model changes ([ac4f30a](https://github.com/ReliefApplications/oort-backend/commit/ac4f30aa11a393758ecea11eab0ab4e63ebf946b))
* saving questions from refData ([b19d387](https://github.com/ReliefApplications/oort-backend/commit/b19d387a2fa2a4e13faad260a0f95ad127b6a1a0))
* schema could break due to reference structure not existing ([744e6dd](https://github.com/ReliefApplications/oort-backend/commit/744e6dd8358fad36d5cf4ebe4280b4afc32e63f5))
* sort and filter by calculated cols ([9672968](https://github.com/ReliefApplications/oort-backend/commit/9672968dea7f21904336256497040155d511df78))
* step field in dashboard.type would raise an issue if dashboard not page of a step ([7f7e2ef](https://github.com/ReliefApplications/oort-backend/commit/7f7e2efdf27ff493f2c3ac1055ce14fcc2decbbe))
* styling rule not taking into account calculated fields ([491a176](https://github.com/ReliefApplications/oort-backend/commit/491a1763282dc25d1e591fd76148fe46e581afff)), closes [AB#60522](https://github.com/AB/issues/60522)
* transform record would not return correct date / time in some cases ([99c20c5](https://github.com/ReliefApplications/oort-backend/commit/99c20c58c8df9192f7aa7351fd95b5c5db69aa72))
* update editForm mutation to save field permission as objectIds and not string ([#614](https://github.com/ReliefApplications/oort-backend/issues/614)) ([927f0a1](https://github.com/ReliefApplications/oort-backend/commit/927f0a15c2d98d70197115214dff69fca3accddf))
* update role resource permissions ([cbd8a1b](https://github.com/ReliefApplications/oort-backend/commit/cbd8a1b2724f964a03dfdad1206dd6492f0544b3))
* updating type on update ([7619e14](https://github.com/ReliefApplications/oort-backend/commit/7619e146b96a254af5cfea2b9a6e1bfde83a9bbc))
* users could not be invited if no position attributes ([#639](https://github.com/ReliefApplications/oort-backend/issues/639)) ([e570e2f](https://github.com/ReliefApplications/oort-backend/commit/e570e2f8e7d21b3fe2eb31612727fbaa9a19ff41))


* drop 1.4 ([58486fa](https://github.com/ReliefApplications/oort-backend/commit/58486fa682555c2f541098f77ba256a1c3246a99))


### Features

* add calcfields stages to aggr pipeline ([8aa158a](https://github.com/ReliefApplications/oort-backend/commit/8aa158ac460585f3d58fa113ab2b861ad295d3b8))
* add lastUpdateForm meta field ([c1ad0bf](https://github.com/ReliefApplications/oort-backend/commit/c1ad0bf83a6a69792d300a2130de490f4b37987a))
* add manage distribution list permission migration ([03b14c0](https://github.com/ReliefApplications/oort-backend/commit/03b14c0f9309596fc7fec79ca14f3b789250250f))
* add possibility to have one dashboard per record ([5843998](https://github.com/ReliefApplications/oort-backend/commit/5843998c6d999f1a838a64ed72bbb869717a37bc)), closes [feat/AB#59620](https://github.com/feat/AB/issues/59620)
* add scss editor in applications ([e266645](https://github.com/ReliefApplications/oort-backend/commit/e26664557ec6cf7a29280fc7eabd8bf252aa36df)), closes [Feat/ab#59756](https://github.com/Feat/ab/issues/59756)
* add substr / toint / tolong calc key ([29fd52b](https://github.com/ReliefApplications/oort-backend/commit/29fd52b529aaadad358d301c32f6762057c55212))
* add substring option to calculated fields ([2a8d4d9](https://github.com/ReliefApplications/oort-backend/commit/2a8d4d961f7b5514c593895b689df0d62da5c30e))
* added date expression ([8d64b25](https://github.com/ReliefApplications/oort-backend/commit/8d64b259f72affb44a8abe96e1e31aacb504023c))
* added special info operators ([977bc4a](https://github.com/ReliefApplications/oort-backend/commit/977bc4a9e80194a0d9b7ccc803a8eff45ef8e59f))
* added today operation + bit of refactoring ([ea5554d](https://github.com/ReliefApplications/oort-backend/commit/ea5554dd3468aff4a8b12ab9fa3b43d3e91b04ea))
* adding derivedFields on custom query ([d003b6f](https://github.com/ReliefApplications/oort-backend/commit/d003b6fd52871c897758d694bfd3035a794c1e59))
* building pipeline for single and double also ([63299ff](https://github.com/ReliefApplications/oort-backend/commit/63299ffe95f7feb9da4cb57390c0953c43542283))
* can now filter fields by template they are used in ([ff470be](https://github.com/ReliefApplications/oort-backend/commit/ff470be6aaa81c58f9d66abcf0bd6e897ff5984a))
* can use multiple fields to filter record history ([28a8739](https://github.com/ReliefApplications/oort-backend/commit/28a8739df8d23b68a69f7e75b0872ed51bfa9d44))
* context filter position of dashboard can now be defaulted at a certain position ([eebec36](https://github.com/ReliefApplications/oort-backend/commit/eebec3652e08cb0cd2da53779f6998067ce9a25e))
* dashboards with context ([341766c](https://github.com/ReliefApplications/oort-backend/commit/341766c59ec1a6d76094279ffb02f1ecfdeea573))
* grouping by null in aggregations ([41a7b9b](https://github.com/ReliefApplications/oort-backend/commit/41a7b9b3cf4f6c5d5f00e95b800b6fef17e3cdec))
* pipeline builder for multiple operators case ([b340f9a](https://github.com/ReliefApplications/oort-backend/commit/b340f9a8af2e567611593e5e32e9265a139f7859))
* possibility to have pages on top of the app ([e116cbf](https://github.com/ReliefApplications/oort-backend/commit/e116cbf146f612568ac76f4ab62da336a5f218bb))
* updated editResource mutation ([6337871](https://github.com/ReliefApplications/oort-backend/commit/6337871aa0c97f6d154a0e40b9e52f90fcd19a66))
* use column width to generate email table ([a1f9c81](https://github.com/ReliefApplications/oort-backend/commit/a1f9c81c366da1d2586b13910b3015827884e63b))


### Performance Improvements

* remove files when deleting forms / resources ([e66e3a5](https://github.com/ReliefApplications/oort-backend/commit/e66e3a5f44f00e8a657343658e8932a8c1530c14)), closes [Feat/ab#61940](https://github.com/Feat/ab/issues/61940)


### BREAKING CHANGES

* drop 1.4 and start 2.0


## [1.3.17](https://github.com/ReliefApplications/oort-backend/compare/v1.3.16...v1.3.17) (2023-05-24)


### Bug Fixes

* could not get canUpdate / canDelete on meta ([914575f](https://github.com/ReliefApplications/oort-backend/commit/914575fb663c52fd6ba1f0eae0b4a744c2db6e58))
* permissions not passed to record resolvers ([62313e9](https://github.com/ReliefApplications/oort-backend/commit/62313e91d5bbb1e64f0f355fcc4c496670349ca1))

## [1.3.16](https://github.com/ReliefApplications/oort-backend/compare/v1.3.15...v1.3.16) (2023-04-25)


### Bug Fixes

* editForm bug when it's the first edition ([5d6ba6a](https://github.com/ReliefApplications/oort-backend/commit/5d6ba6ad87dc003bad5f1a8082aed49294dfb9a3))
* **editForm:** keep edited core fields permissions so they're correctly propagated to child resources [#61030](https://github.com/ReliefApplications/oort-backend/issues/61030) ([0fa197e](https://github.com/ReliefApplications/oort-backend/commit/0fa197e2a5535dde546237723acfdbf55fcfad7f))
* logic issue for neq operator ([5c259fd](https://github.com/ReliefApplications/oort-backend/commit/5c259fd28d4e6a8ecdf3dc032c65ae1bef35a736))
* permissions could be lost when saving some templates ([6725e56](https://github.com/ReliefApplications/oort-backend/commit/6725e566e33c7056bf12302ddf6d27d44ea22bd5)), closes [fix/AB#61030](https://github.com/fix/AB/issues/61030)

## [1.3.15](https://github.com/ReliefApplications/oort-backend/compare/v1.3.14...v1.3.15) (2023-04-20)


### Bug Fixes

* unable to download xlsx for records due to rate limit middleware ([944b11d](https://github.com/ReliefApplications/oort-backend/commit/944b11d7cea61f8f0a68e88651e0b1db87bc8cb5)), closes [1.3.x/ab#62056](https://github.com/1.3.x/ab/issues/62056)

## [1.3.14](https://github.com/ReliefApplications/oort-backend/compare/v1.3.13...v1.3.14) (2023-04-14)


### Bug Fixes

* empty email rows would break email sending ([3fa1268](https://github.com/ReliefApplications/oort-backend/commit/3fa126856ec20308976ecdbbf3096297fed0a988))
* empty rows & columns could break emails ([8460da4](https://github.com/ReliefApplications/oort-backend/commit/8460da454145c219185d4ec093f20942786ddb87))

## [1.3.13](https://github.com/ReliefApplications/oort-backend/compare/v1.3.12...v1.3.13) (2023-03-16)


### Performance Improvements

* add auto update of docker images ([a9069fc](https://github.com/ReliefApplications/oort-backend/commit/a9069fc23870e079d28fb0e749412c64d0aa8143)), closes [AB#57888](https://github.com/AB/issues/57888)

## [1.3.12](https://github.com/ReliefApplications/oort-backend/compare/v1.3.11...v1.3.12) (2023-02-21)


### Bug Fixes

* **permissions:** compute correct permissions and prevent fails ([66c84a6](https://github.com/ReliefApplications/oort-backend/commit/66c84a64ff8a1b52bb541b80adc6e8c9263259d1))

## [1.3.11](https://github.com/ReliefApplications/oort-backend/compare/v1.3.10...v1.3.11) (2023-02-09)


### Bug Fixes

* **agg:** aggregation on related field sharing same name ([3dd18c3](https://github.com/ReliefApplications/oort-backend/commit/3dd18c35112dff7ffb3d8ecad9141d41547d6431))
* **agg:** fix issue with filter on resource + optimize query ([5095719](https://github.com/ReliefApplications/oort-backend/commit/509571964a62ad1d34f357a417487861133eb0c8))

## [1.3.10](https://github.com/ReliefApplications/oort-backend/compare/v1.3.9...v1.3.10) (2023-02-03)


### Bug Fixes

* step could not be duplicated ([08e278a](https://github.com/ReliefApplications/oort-backend/commit/08e278a73f997381e9dbbfafe146515bce7e62ef))

## [1.3.9](https://github.com/ReliefApplications/oort-backend/compare/v1.3.8...v1.3.9) (2023-01-26)


### Bug Fixes

* adapt who config to new EMRS endpoint ([#516](https://github.com/ReliefApplications/oort-backend/issues/516)) ([1f80cd5](https://github.com/ReliefApplications/oort-backend/commit/1f80cd5bed807fb539a694308eab07e2c9b17eb8))
* could not update permission filters on resources when editing the value of the filter ([6a3af7b](https://github.com/ReliefApplications/oort-backend/commit/6a3af7b9cee17925a9c5645e959ad56856044be3)), closes [AB#54743](https://github.com/AB/issues/54743) [AB#54743](https://github.com/AB/issues/54743)
* form field could not be exported ([fbb4e2d](https://github.com/ReliefApplications/oort-backend/commit/fbb4e2d4e7fe13db663802db30acf0a52421e4c9)), closes [AB#44839](https://github.com/AB/issues/44839)

## [1.3.8](https://github.com/ReliefApplications/oort-backend/compare/v1.3.7...v1.3.8) (2023-01-17)


### Bug Fixes

* adding canSee and canUpdate filters on resource without global access on it could break ([5c603cf](https://github.com/ReliefApplications/oort-backend/commit/5c603cfa2655333ad4c165dec6b924fc82922acc))

## [1.3.7](https://github.com/ReliefApplications/oort-backend/compare/v1.3.6...v1.3.7) (2023-01-16)


### Bug Fixes

* oort config would display groups from external service by default ([64336bf](https://github.com/ReliefApplications/oort-backend/commit/64336bfb2159595f9d02f02232000f65497ffd59))

## [1.3.6](https://github.com/ReliefApplications/oort-backend/compare/v1.3.5...v1.3.6) (2023-01-10)


### Bug Fixes

* aggregation pagination not working ([b6c23cb](https://github.com/ReliefApplications/oort-backend/commit/b6c23cbd7f8f23eeac9eaa8d9134391573a69c2e))
* requests with metadata could cause system failure ([8981dea](https://github.com/ReliefApplications/oort-backend/commit/8981dea9b803c9f018f46398c513a03c00dcb5dd)), closes [1.3.x/AB#53528](https://github.com/1.3.x/AB/issues/53528)
* validation on a form using choicesByUrl could send 401 errors due to missing token ([0fb643e](https://github.com/ReliefApplications/oort-backend/commit/0fb643e78287c38b664737a58190968a0eddf216))

## [1.3.5](https://github.com/ReliefApplications/oort-backend/compare/v1.3.4...v1.3.5) (2023-01-04)


### Bug Fixes

* sorting on multi select field could break records aggregation ([79ac65e](https://github.com/ReliefApplications/oort-backend/commit/79ac65e818b5a4cfc41bf5e3b82b7fd9c20ff3d1))

## [1.3.4](https://github.com/ReliefApplications/oort-backend/compare/v1.3.3...v1.3.4) (2023-01-03)


### Bug Fixes

* file question type now supported in record history ([eb53df8](https://github.com/ReliefApplications/oort-backend/commit/eb53df84e6edd2c2b60ece813b2c7dc4f67533e0)), closes [AB#52075](https://github.com/AB/issues/52075)
* infinite loop when getting form / resource metadata, due to relationship between resources ([1cbc6b1](https://github.com/ReliefApplications/oort-backend/commit/1cbc6b1b5fa6bcde30a43e840500d8b42bc08556))
* user could see 'add' button on grids, even if not authorized ([62d07be](https://github.com/ReliefApplications/oort-backend/commit/62d07bec9453f81b6460dfa04a332f2e37bad675))

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
