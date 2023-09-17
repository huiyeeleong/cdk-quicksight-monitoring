#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkQuicksightMonitoringStack } from '../lib/cdk-quicksight-monitoring-stack';
import { CdkQuicksighStack } from '../lib/cdk-quicksight-stack';

const app = new cdk.App();
new CdkQuicksightMonitoringStack(app, 'CdkQuicksightMonitoringStack', {
});
new CdkQuicksighStack(app, 'CdkQuicksighStack', {
});